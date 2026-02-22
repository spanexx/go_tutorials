/**
 * ExploreService
 *
 * Service for managing explore page content via API.
 *
 * Features:
 * - Signal-based state management for reactive UI updates
 * - Fetch trending topics and suggested users from backend
 * - Categories remain static (UI configuration)
 * - Caching with expiration (5 minutes)
 *
 * CID: Phase-2 Milestone 2.3 - Hashtags & Mentions (Refactored)
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { IMAGE_PLACEHOLDERS } from '../constants/app.constants';

export interface TrendingTopic {
  id: number;
  title: string;
  category: string;
  posts: number;
  image?: string;
  gradient: string;
}

export interface ExploreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SuggestedUser {
  username: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  isFollowing: boolean;
}

interface ExploreState {
  trendingTopics: TrendingTopic[];
  suggestedUsers: SuggestedUser[];
  isLoadingTrending: boolean;
  isLoadingUsers: boolean;
  error: string | null;
  lastFetchedTrending: number | null;
  lastFetchedUsers: number | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

@Injectable({
  providedIn: 'root'
})
export class ExploreService extends BaseApiService {
  // Static categories (UI configuration, not data)
  private readonly categoriesData: ExploreCategory[] = [
    { id: 'all', name: 'All', icon: '🌐', color: '#6366f1' },
    { id: 'technology', name: 'Technology', icon: '💻', color: '#3b82f6' },
    { id: 'design', name: 'Design', icon: '🎨', color: '#ec4899' },
    { id: 'development', name: 'Development', icon: '⚡', color: '#8b5cf6' },
    { id: 'business', name: 'Business', icon: '📈', color: '#10b981' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '✨', color: '#f59e0b' }
  ];

  private exploreState = signal<ExploreState>({
    trendingTopics: [],
    suggestedUsers: [],
    isLoadingTrending: false,
    isLoadingUsers: false,
    error: null,
    lastFetchedTrending: null,
    lastFetchedUsers: null
  });

  // Computed signals
  readonly categories = computed(() => this.categoriesData);
  readonly trendingTopics = computed(() => this.exploreState().trendingTopics);
  readonly suggestedUsers = computed(() => this.exploreState().suggestedUsers);
  readonly isLoadingTrending = computed(() => this.exploreState().isLoadingTrending);
  readonly isLoadingUsers = computed(() => this.exploreState().isLoadingUsers);
  readonly error = computed(() => this.exploreState().error);

  constructor(
    http: HttpClient
  ) {
    super(http);
    // Initial load
    this.refreshTrending();
    this.refreshSuggestedUsers();
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(lastFetched: number | null): boolean {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION;
  }

  /**
   * Fetch trending topics from API
   */
  async refreshTrending(): Promise<void> {
    const state = this.exploreState();

    // Use cache if valid
    if (this.isCacheValid(state.lastFetchedTrending) && state.trendingTopics.length > 0) {
      return;
    }

    this.exploreState.update(s => ({ ...s, isLoadingTrending: true, error: null }));

    try {
      // Get trending hashtags from API
      const hashtags = await this.get<{ tag: string; count: number }[]>('/hashtags/trending').toPromise();

      if (hashtags && hashtags.length > 0) {
        // Map API response to TrendingTopic format
        const topics: TrendingTopic[] = hashtags.map((h, index) => ({
          id: index + 1,
          title: h.tag,
          category: this.inferCategory(h.tag),
          posts: h.count,
          gradient: this.getGradientForIndex(index)
        }));

        this.exploreState.update(s => ({
          ...s,
          trendingTopics: topics,
          isLoadingTrending: false,
          lastFetchedTrending: Date.now()
        }));
      } else {
        this.exploreState.update(s => ({
          ...s,
          trendingTopics: [],
          isLoadingTrending: false,
          lastFetchedTrending: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
      this.exploreState.update(s => ({
        ...s,
        isLoadingTrending: false,
        error: 'Failed to load trending topics'
      }));
    }
  }

  /**
   * Fetch suggested users from API
   */
  async refreshSuggestedUsers(): Promise<void> {
    const state = this.exploreState();

    // Use cache if valid
    if (this.isCacheValid(state.lastFetchedUsers) && state.suggestedUsers.length > 0) {
      return;
    }

    this.exploreState.update(s => ({ ...s, isLoadingUsers: true, error: null }));

    try {
      const users = await this.get<{
        id: string;
        username: string;
        display_name: string;
        avatar_url: string;
        bio: string;
        followers_count: number;
      }[]>('/users/suggested', { limit: '10' }).toPromise();

      if (users && users.length > 0) {
        const suggestedUsers: SuggestedUser[] = users.map(u => ({
          username: u.username,
          name: u.display_name,
          avatar: u.avatar_url || IMAGE_PLACEHOLDERS.avatar,
          bio: u.bio || '',
          followers: u.followers_count || 0,
          isFollowing: false
        }));

        this.exploreState.update(s => ({
          ...s,
          suggestedUsers,
          isLoadingUsers: false,
          lastFetchedUsers: Date.now()
        }));
      } else {
        this.exploreState.update(s => ({
          ...s,
          suggestedUsers: [],
          isLoadingUsers: false,
          lastFetchedUsers: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch suggested users:', error);
      this.exploreState.update(s => ({
        ...s,
        isLoadingUsers: false,
        error: 'Failed to load suggested users'
      }));
    }
  }

  /**
   * Get trending topics by category
   */
  getTrendingByCategory(category: string): TrendingTopic[] {
    const topics = this.exploreState().trendingTopics;
    if (category === 'all') {
      return topics;
    }
    return topics.filter(topic => topic.category === category);
  }

  /**
   * Get top trending topics
   */
  getTopTrending(limit: number = 6): TrendingTopic[] {
    return [...this.exploreState().trendingTopics]
      .sort((a, b) => b.posts - a.posts)
      .slice(0, limit);
  }

  /**
   * Toggle follow status for a user
   */
  toggleFollow(username: string): void {
    this.exploreState.update(state => ({
      ...state,
      suggestedUsers: state.suggestedUsers.map(user =>
        user.username === username
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    }));
  }

  /**
   * Check if following a user
   */
  isFollowing(username: string): boolean {
    const user = this.exploreState().suggestedUsers.find(u => u.username === username);
    return user?.isFollowing || false;
  }

  /**
   * Search topics
   */
  searchTopics(query: string): TrendingTopic[] {
    const normalizedQuery = query.toLowerCase();
    return this.exploreState().trendingTopics.filter(topic =>
      topic.title.toLowerCase().includes(normalizedQuery) ||
      topic.category.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.exploreState.update(s => ({ ...s, error: null }));
  }

  /**
   * Infer category from hashtag title
   */
  private inferCategory(title: string): string {
    const tech = ['tech', 'ai', 'coding', 'programming', 'software', 'dev', 'web', 'app', 'computer'];
    const design = ['design', 'ui', 'ux', 'creative', 'art', 'graphic'];
    const development = ['javascript', 'typescript', 'angular', 'react', 'vue', 'node', 'python', 'java', 'go', 'golang', 'dev', 'code'];
    const business = ['startup', 'business', 'entrepreneur', 'marketing', 'sales', 'finance'];
    const lifestyle = ['life', 'health', 'fitness', 'travel', 'food', 'fashion'];

    const lower = title.toLowerCase();

    if (development.some(d => lower.includes(d))) return 'development';
    if (tech.some(t => lower.includes(t))) return 'technology';
    if (design.some(d => lower.includes(d))) return 'design';
    if (business.some(b => lower.includes(b))) return 'business';
    if (lifestyle.some(l => lower.includes(l))) return 'lifestyle';

    return 'all';
  }

  /**
   * Get gradient for trending topic based on index
   */
  private getGradientForIndex(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
    ];
    return gradients[index % gradients.length];
  }
}
