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
  async getPostsByHashtag(hashtag: string): Promise<string[]> {
    try {
      debugLog('HashtagService', 'getPostsByHashtag() started', { hashtag });
      const response = await this.get<{ posts: string[] }>(`/hashtags/${hashtag}/posts`).toPromise();
      return response?.posts || [];
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
      const trending = await this.get<Hashtag[]>('/hashtags/trending').toPromise() || [];
      const hashtagMap: Record<string, Hashtag> = {};
      trending.forEach(h => {
        hashtagMap[h.tag.toLowerCase()] = h;
      });
      
      this.hashtagState.set({
        hashtags: hashtagMap,
        trending: trending.filter(h => h.trending).map(h => h.tag).slice(0, 5),
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
      const info = await this.get<HashtagInfo>(`/hashtags/${normalizedTag}`).toPromise();
      if (info) {
        return info;
      }
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
      const trending = await this.get<HashtagInfo[]>(`/hashtags/trending`, { limit }).toPromise();
      if (trending) {
        return trending;
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
}
