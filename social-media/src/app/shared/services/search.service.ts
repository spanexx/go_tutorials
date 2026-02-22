import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { PostService, Post } from './post.service';
import { debugLog, debugWarn } from '../utils/debug-logger';

export interface SearchUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers: number;
}

export interface SearchResult {
  posts: Post[];
  users: SearchUser[];
  hashtags: SearchHashtag[];
  query: string;
  total: number;
  limit: number;
  offset: number;
}

export interface SearchItem {
  type: 'post' | 'user' | 'hashtag';
  item: Post | SearchUser | SearchHashtag;
  relevanceScore: number;
}

export interface SearchHashtag {
  tag: string;
  count: number;
}

/**
 * SearchService - Handles search functionality across posts, users, and hashtags
 *
 * Provides methods to:
 * - Search across all content types
 * - Get trending hashtags
 * - Get suggested users to follow
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService extends BaseApiService {
  private searchQuerySignal = signal<string>('');
  private searchResultsSignal = signal<SearchResult>({
    posts: [],
    users: [],
    hashtags: [],
    query: '',
    total: 0,
    limit: 10,
    offset: 0
  });
  private isSearchingSignal = signal<boolean>(false);

  private trendingHashtagsSignal = signal<SearchHashtag[]>([]);
  private suggestedUsersSignal = signal<SearchUser[]>([]);

  constructor(
    http: HttpClient,
    private postService: PostService
  ) {
    super(http);

    // Warm caches (best-effort)
    void this.refreshTrendingHashtags();
    void this.refreshSuggestedUsers();
  }

  get searchQuery(): string {
    return this.searchQuerySignal();
  }

  get searchResults(): SearchResult {
    return this.searchResultsSignal();
  }

  get isSearching(): boolean {
    return this.isSearchingSignal();
  }

  /**
   * Search across posts, users, and hashtags
   * Uses backend API with fallback to local post search
   */
  search(query: string, limit: number = 10, offset: number = 0): void {
    if (!query || query.trim().length === 0) {
      this.clearSearch();
      return;
    }

    this.isSearchingSignal.set(true);
    this.searchQuerySignal.set(query.trim());

    debugLog('SearchService', 'search() started', { query: query.trim(), limit, offset });

    // Call backend search API
    this.get<SearchResult>('/search', { q: query, limit, offset }).subscribe({
      next: (results) => {
        debugLog('SearchService', 'search() api results received', {
          users: results.users?.length ?? 0,
          hashtags: results.hashtags?.length ?? 0,
          posts: results.posts?.length ?? 0
        });
        // Merge with local post search for comprehensive results
        const localPosts = this.searchLocalPosts(query.toLowerCase().trim());

        this.searchResultsSignal.set({
          ...results,
          posts: [...localPosts.slice(0, 5), ...(results.posts || [])].slice(0, limit)
        });
        this.isSearchingSignal.set(false);
      },
      error: (error) => {
        debugWarn('SearchService', 'search() api failed', error);
        console.warn('Search API unavailable');
        // Return empty results on API failure
        const localPosts = this.searchLocalPosts(query.toLowerCase().trim());
        this.searchResultsSignal.set({
          posts: localPosts.slice(0, limit),
          users: [],
          hashtags: [],
          query: query,
          total: localPosts.length,
          limit,
          offset
        });
        this.isSearchingSignal.set(false);
      }
    });
  }

  /**
   * Search posts locally (for when API is unavailable or for additional filtering)
   */
  private searchLocalPosts(query: string): Post[] {
    const allPosts = this.postService.posts();
    const results: Post[] = [];

    for (const post of allPosts) {
      const contentMatch = post.content.toLowerCase().includes(query);
      const authorNameMatch = post.author.name.toLowerCase().includes(query);
      const authorUsernameMatch = post.author.username.toLowerCase().includes(query);

      if (contentMatch || authorNameMatch || authorUsernameMatch) {
        results.push(post);
      }
    }

    return results;
  }



  /**
   * Get trending hashtags from backend
   * Returns empty array if not cached and API fails
   */
  getTrendingHashtags(): SearchHashtag[] {
    return this.trendingHashtagsSignal();
  }

  /**
   * Get suggested users from backend
   * Returns empty array if not cached and API fails
   */
  getSuggestedUsers(limit: number = 5): SearchUser[] {
    return this.suggestedUsersSignal().slice(0, limit);
  }

  async refreshTrendingHashtags(): Promise<void> {
    try {
      debugLog('SearchService', 'refreshTrendingHashtags() started');
      const hashtags = await this.get<SearchHashtag[]>(`/hashtags/trending`).toPromise();
      if (hashtags) {
        debugLog('SearchService', 'refreshTrendingHashtags() success', { count: hashtags.length });
        this.trendingHashtagsSignal.set(hashtags);
      }
    } catch (error) {
      debugWarn('SearchService', 'refreshTrendingHashtags() failed', error);
    }
  }

  async refreshSuggestedUsers(limit: number = 5): Promise<void> {
    try {
      debugLog('SearchService', 'refreshSuggestedUsers() started', { limit });
      const users = await this.get<SearchUser[]>(`/users/suggested`, { limit }).toPromise();
      if (users) {
        debugLog('SearchService', 'refreshSuggestedUsers() success', { count: users.length });
        this.suggestedUsersSignal.set(users);
      }
    } catch (error) {
      debugWarn('SearchService', 'refreshSuggestedUsers() failed', error);
    }
  }

  clearSearch(): void {
    this.searchQuerySignal.set('');
    this.searchResultsSignal.set({
      posts: [],
      users: [],
      hashtags: [],
      query: '',
      total: 0,
      limit: 10,
      offset: 0
    });
  }

  /**
   * Search posts only
   * @param query - Search query (minimum 2 characters)
   * @param limit - Maximum results (default 20)
   * @returns Array of posts matching the query
   */
  searchPosts(query: string, limit: number = 20): Post[] {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.searchLocalPosts(query.toLowerCase().trim()).slice(0, limit);
  }

  /**
   * Search users only
   * @param query - Search query (minimum 2 characters)
   * @param limit - Maximum results (default 20)
   * @returns Array of users matching the query
   */
  searchUsers(query: string, limit: number = 20): SearchUser[] {
    if (!query || query.trim().length < 2) {
      return [];
    }
    // Only search cached suggested users locally
    const searchTerm = query.toLowerCase().trim();
    return this.suggestedUsersSignal().filter(u =>
      u.display_name.toLowerCase().includes(searchTerm) ||
      u.username.toLowerCase().includes(searchTerm) ||
      u.bio.toLowerCase().includes(searchTerm)
    ).slice(0, limit);
  }

  /**
   * Search hashtags only
   * @param query - Search query (minimum 2 characters)
   * @param limit - Maximum results (default 20)
   * @returns Array of hashtags matching the query
   */
  searchHashtags(query: string, limit: number = 20): SearchHashtag[] {
    if (!query || query.trim().length < 2) {
      return [];
    }
    // Only search cached trending hashtags locally
    const searchTerm = query.toLowerCase().trim();
    return this.trendingHashtagsSignal().filter(h =>
      h.tag.toLowerCase().includes(searchTerm)
    ).slice(0, limit);
  }

  /**
   * Search all content types
   * @param query - Search query (minimum 2 characters)
   * @param limit - Maximum results per type (default 20)
   * @returns Array of search items with type and relevance score
   */
  searchAll(query: string, limit: number = 20): SearchItem[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results: SearchItem[] = [];

    // Search posts
    const posts = this.searchPosts(query, limit);
    posts.forEach(post => {
      let score = 0;
      if (post.content.toLowerCase().includes(searchTerm)) score += 10;
      if (post.author.name.toLowerCase().includes(searchTerm)) score += 5;
      if (post.author.username.toLowerCase().includes(searchTerm)) score += 5;
      results.push({ type: 'post', item: post, relevanceScore: score });
    });

    // Search users
    const users = this.searchUsers(query, limit);
    users.forEach(user => {
      let score = 0;
      if (user.display_name.toLowerCase().includes(searchTerm)) score += 10;
      if (user.username.toLowerCase().includes(searchTerm)) score += 10;
      if (user.bio.toLowerCase().includes(searchTerm)) score += 3;
      results.push({ type: 'user', item: user, relevanceScore: score });
    });

    // Search hashtags
    const hashtags = this.searchHashtags(query, limit);
    hashtags.forEach(hashtag => {
      let score = hashtag.count / 10000; // Score by popularity
      if (hashtag.tag.toLowerCase() === searchTerm) score += 50;
      results.push({ type: 'hashtag', item: hashtag, relevanceScore: score });
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
