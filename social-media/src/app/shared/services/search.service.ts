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

  // Fallback data for when API is unavailable
  private readonly fallbackUsers: SearchUser[] = [
    {
      id: '1',
      username: 'sarahjohnson',
      display_name: 'Sarah Johnson',
      avatar_url: 'https://i.pravatar.cc/150?img=5',
      bio: 'Frontend Developer | UI/UX Enthusiast',
      followers: 12500
    },
    {
      id: '2',
      username: 'alexchen',
      display_name: 'Alex Chen',
      avatar_url: 'https://i.pravatar.cc/150?img=3',
      bio: 'Full Stack Developer | Open Source Contributor',
      followers: 8900
    },
    {
      id: '3',
      username: 'marcuswilliams',
      display_name: 'Marcus Williams',
      avatar_url: 'https://i.pravatar.cc/150?img=12',
      bio: 'Tech Writer | TypeScript Advocate',
      followers: 15300
    }
  ];

  private readonly fallbackHashtags: SearchHashtag[] = [
    { tag: 'WebDevelopment', count: 145000 },
    { tag: 'Angular', count: 89000 },
    { tag: 'TypeScript', count: 112000 },
    { tag: 'JavaScript', count: 234000 },
    { tag: 'UIDesign', count: 67000 },
    { tag: 'Golang', count: 54000 },
    { tag: 'Coding', count: 189000 },
    { tag: 'Programming', count: 167000 },
    { tag: 'Tech', count: 156000 },
    { tag: 'Developer', count: 134000 }
  ];

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
        debugWarn('SearchService', 'search() api failed, using fallback', error);
        console.warn('Search API unavailable, using fallback data');
        // Fallback to local search only
        const localPosts = this.searchLocalPosts(query.toLowerCase().trim());
        this.searchResultsSignal.set({
          posts: localPosts.slice(0, limit),
          users: this.fallbackUsers.filter(u =>
            u.display_name.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase())
          ).slice(0, limit),
          hashtags: this.fallbackHashtags.filter(h =>
            h.tag.toLowerCase().includes(query.toLowerCase())
          ).slice(0, limit),
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
   */
  getTrendingHashtags(): SearchHashtag[] {
    const cached = this.trendingHashtagsSignal();
    if (cached.length > 0) {
      return cached;
    }
    return [...this.fallbackHashtags].sort((a, b) => b.count - a.count).slice(0, 5);
  }

  /**
   * Get suggested users from backend
   */
  getSuggestedUsers(limit: number = 5): SearchUser[] {
    const cached = this.suggestedUsersSignal();
    if (cached.length > 0) {
      return cached.slice(0, limit);
    }
    return [...this.fallbackUsers].slice(0, limit);
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
}
