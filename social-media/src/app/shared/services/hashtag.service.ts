// Code Map: hashtag.service.ts
// - HashtagService: Service for tracking and managing hashtags
// - Signal-based state for reactive updates
// - Methods: getTrending, getPostsByHashtag, searchHashtags, getHashtagInfo
// - Mock data for development (to be replaced with API in Phase 2.6)
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Injectable, signal, computed } from '@angular/core';
import { Post } from './post.service';

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
export class HashtagService {
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

  constructor() {
    // Initialize with mock trending hashtags for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockHashtags: Record<string, Hashtag> = {
      'angular': { tag: 'angular', count: 1250, trending: true },
      'typescript': { tag: 'typescript', count: 980, trending: true },
      'webdev': { tag: 'webdev', count: 856, trending: true },
      'javascript': { tag: 'javascript', count: 742, trending: false },
      'coding': { tag: 'coding', count: 623, trending: false },
      'programming': { tag: 'programming', count: 589, trending: false },
      'developer': { tag: 'developer', count: 445, trending: false },
      'tech': { tag: 'tech', count: 398, trending: false },
      'opensource': { tag: 'opensource', count: 312, trending: false },
      '100DaysOfCode': { tag: '100DaysOfCode', count: 287, trending: true }
    };

    this.hashtagState.set({
      hashtags: mockHashtags,
      trending: Object.values(mockHashtags)
        .filter(h => h.trending)
        .map(h => h.tag)
        .slice(0, 5),
      isLoading: false
    });
  }

  /**
   * Get posts by hashtag (placeholder for API integration)
   */
  getPostsByHashtag(hashtag: string): Promise<string[]> {
    return new Promise((resolve) => {
      // Mock implementation - return empty array
      // In Phase 2.6, this will call the backend API
      console.log(`Getting posts for hashtag: #${hashtag}`);
      resolve([]);
    });
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
   * Refresh trending hashtags (placeholder for API)
   */
  refreshTrending(): Promise<void> {
    return new Promise((resolve) => {
      // Mock implementation
      console.log('Refreshing trending hashtags...');
      resolve();
    });
  }

  /**
   * Get hashtag info with posts (for hashtag page)
   */
  getHashtagInfo(tag: string): HashtagInfo {
    const normalizedTag = tag.toLowerCase().replace('#', '');
    const stats = this.getHashtagStats(normalizedTag);
    
    return {
      tag: normalizedTag,
      count: stats?.count || 0,
      posts: [], // Mock - will be populated from API in Phase 2.6
      trending: stats?.trending || false
    };
  }

  /**
   * Get trending hashtags
   */
  getTrendingHashtags(limit: number = 5): HashtagInfo[] {
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
