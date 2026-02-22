// Code Map: hashtag.service.ts
// - HashtagService: Service for tracking and managing hashtags via API
// - Extends BaseApiService for HTTP calls
// - Signal-based state for reactive updates
// - Methods: getTrending, getPostsByHashtag, searchHashtags, getHashtagInfo
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Post } from './post.service';
import { debugLog, debugWarn } from '../utils/debug-logger';

type SearchHashtag = {
  tag: string;
  count: number;
};

type SearchResponse = {
  hashtags: SearchHashtag[];
};

type HashtagPostsResponse = {
  posts: Array<{
    id: string;
    user_id: string;
    content: string;
    image_url?: string | null;
    video_url?: string | null;
    likes_count?: number;
    comments_count?: number;
    shares_count?: number;
    created_at?: string;
    user_name?: string;
    user_username?: string;
    user_avatar?: string;
  }>;
  page?: number;
  limit?: number;
  total_count?: number;
  has_more?: boolean;
};

export interface Hashtag {
  tag: string;
  count: number;
  trending: boolean;
  lastUsed?: Date;
}

export interface HashtagInfo {
  tag: string;
  count: number;
  posts: Post[];
  trending: boolean;
}

export interface HashtagState {
  hashtags: Record<string, Hashtag>;
  trending: string[];
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HashtagService extends BaseApiService {
  private hashtagState = signal<HashtagState>({
    hashtags: {},
    trending: [],
    isLoading: false
  });

  // Get all hashtags
  hashtags = computed(() => this.hashtagState().hashtags);

  // Get trending hashtags
  trending = computed(() => this.hashtagState().trending);

  // Check if loading
  isLoading = computed(() => this.hashtagState().isLoading);

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Get posts by hashtag from API
   */
  async getPostsByHashtag(hashtag: string, page: number = 1, limit: number = 20): Promise<Post[]> {
    try {
      debugLog('HashtagService', 'getPostsByHashtag() started', { hashtag });
      const normalized = hashtag.toLowerCase().replace('#', '');
      const response = await this.get<HashtagPostsResponse>(`/hashtag/${normalized}`, {
        page: String(page),
        limit: String(limit)
      }).toPromise();
      return (response?.posts ?? []).map(p => this.mapApiPostToPost(p));
    } catch (error) {
      debugWarn('HashtagService', 'getPostsByHashtag() failed', error);
      console.error(`Failed to get posts for hashtag #${hashtag}:`, error);
      return [];
    }
  }

  /**
   * Search hashtags by prefix
   */
  searchHashtags(prefix: string, limit: number = 10): Hashtag[] {
    if (!prefix) {
      return [];
    }

    const allHashtags = Object.values(this.hashtags());
    return allHashtags
      .filter(h => h.tag.toLowerCase().startsWith(prefix.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get or create a hashtag
   */
  getOrCreateHashtag(tag: string): Hashtag {
    const normalizedTag = tag.toLowerCase();
    const state = this.hashtagState();
    
    if (state.hashtags[normalizedTag]) {
      return state.hashtags[normalizedTag];
    }

    // Create new hashtag
    const newHashtag: Hashtag = {
      tag: normalizedTag,
      count: 0,
      trending: false,
      lastUsed: new Date()
    };

    this.hashtagState.update(state => ({
      ...state,
      hashtags: {
        ...state.hashtags,
        [normalizedTag]: newHashtag
      }
    }));

    return newHashtag;
  }

  /**
   * Increment hashtag usage count
   */
  incrementHashtag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    const state = this.hashtagState();
    const existing = state.hashtags[normalizedTag];

    if (existing) {
      this.hashtagState.update(state => ({
        ...state,
        hashtags: {
          ...state.hashtags,
          [normalizedTag]: {
            ...existing,
            count: existing.count + 1,
            lastUsed: new Date()
          }
        }
      }));
    } else {
      this.getOrCreateHashtag(tag);
      this.incrementHashtag(tag);
    }
  }

  /**
   * Process content and track all hashtags
   */
  trackHashtagsInContent(content: string): string[] {
    const hashtags = this.extractHashtags(content);
    hashtags.forEach(tag => this.incrementHashtag(tag));
    return hashtags;
  }

  /**
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    if (!content) {
      return [];
    }

    // Remove code blocks
    const withoutCode = content.replace(/```[\s\S]*?```|`[^`]*`/g, '');
    
    const hashtags = new Set<string>();
    const matches = withoutCode.match(/(?<!\S)#([a-zA-Z][a-zA-Z0-9_]*)/g);
    
    if (matches) {
      matches.forEach(match => {
        hashtags.add(match.substring(1).toLowerCase());
      });
    }

    return Array.from(hashtags);
  }

  /**
   * Get hashtag stats
   */
  getHashtagStats(tag: string): Hashtag | null {
    const normalizedTag = tag.toLowerCase();
    return this.hashtags()[normalizedTag] || null;
  }

  /**
   * Refresh trending hashtags from API
   */
  async refreshTrending(): Promise<void> {
    this.hashtagState.update(state => ({ ...state, isLoading: true }));
    
    try {
      const trending = await this.get<SearchHashtag[]>('/hashtags/trending').toPromise() || [];
      const hashtagMap: Record<string, Hashtag> = {};
      trending.forEach(h => {
        hashtagMap[h.tag.toLowerCase()] = {
          tag: h.tag.toLowerCase(),
          count: h.count,
          trending: true,
          lastUsed: new Date()
        };
      });

      this.hashtagState.set({
        hashtags: hashtagMap,
        trending: trending.map(h => h.tag.toLowerCase()).slice(0, 10),
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to refresh trending hashtags:', error);
      this.hashtagState.update(state => ({ ...state, isLoading: false }));
    }
  }

  /**
   * Get hashtag info with posts from API
   */
  async getHashtagInfo(tag: string): Promise<HashtagInfo> {
    const normalizedTag = tag.toLowerCase().replace('#', '');

    try {
      const [posts, searchResp] = await Promise.all([
        this.getPostsByHashtag(normalizedTag, 1, 20),
        this.get<SearchResponse>('/search', {
          q: `#${normalizedTag}`,
          type: 'hashtags',
          limit: '1',
          offset: '0'
        }).toPromise()
      ]);

      const count = searchResp?.hashtags?.[0]?.count ?? posts.length;
      const stats = this.getHashtagStats(normalizedTag);

      return {
        tag: normalizedTag,
        count,
        posts,
        trending: stats?.trending || false
      };
    } catch (error) {
      console.error(`Failed to get hashtag info for #${tag}:`, error);
    }
    
    // Fallback
    const stats = this.getHashtagStats(normalizedTag);
    return {
      tag: normalizedTag,
      count: stats?.count || 0,
      posts: [],
      trending: stats?.trending || false
    };
  }

  /**
   * Get trending hashtags from API
   */
  async getTrendingHashtags(limit: number = 5): Promise<HashtagInfo[]> {
    try {
      const trending = await this.get<SearchHashtag[]>(`/hashtags/trending`).toPromise();
      if (trending) {
        return trending.slice(0, limit).map(h => ({
          tag: h.tag.toLowerCase(),
          count: h.count,
          posts: [],
          trending: true
        }));
      }
    } catch (error) {
      console.error('Failed to get trending hashtags:', error);
    }
    
    // Fallback to local state
    const state = this.hashtagState();
    return state.trending
      .slice(0, limit)
      .map(tag => {
        const hashtag = state.hashtags[tag];
        return {
          tag: hashtag.tag,
          count: hashtag.count,
          posts: [],
          trending: hashtag.trending
        };
      });
  }

  private mapApiPostToPost(p: HashtagPostsResponse['posts'][number]): Post {
    return {
      id: p.id,
      author: {
        id: p.user_id,
        name: p.user_name ?? 'Unknown',
        username: p.user_username ?? 'unknown',
        avatar: p.user_avatar ?? ''
      },
      content: p.content,
      timestamp: p.created_at ?? '',
      created_at: p.created_at,
      likes: p.likes_count ?? 0,
      replies: 0,
      shares: p.shares_count ?? 0,
      image: p.image_url ?? undefined,
      image_url: p.image_url ?? undefined,
      video_url: p.video_url ?? undefined
    };
  }
}
