import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { PostService } from './post.service';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export interface AnalyticsMetrics {
  totalPosts: number;
  totalLikes: number;
  totalReplies: number;
  totalShares: number;
  avgEngagementRate: number;
  topPost: {
    id: string;
    content: string;
    likes: number;
    replies: number;
  } | null;
}

export interface EngagementData {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface FollowerGrowth {
  date: string;
  count: number;
  new: number;
  lost: number;
}

export interface AnalyticsStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_followers: number;
  total_following: number;
  engagement_rate: number;
}

/**
 * AnalyticsService - Fetches and manages analytics data
 *
 * Provides methods to retrieve:
 * - Engagement metrics over time
 * - Follower growth data
 * - Overall statistics
 * - Engagement trends
 * - Top hashtags from local posts
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService extends BaseApiService {
  // Cached API data
  private cachedEngagementData: EngagementData[] | null = null;
  private cachedFollowerGrowth: FollowerGrowth[] | null = null;
  private cachedTopPosts: any[] | null = null;

  // Signal-based analytics state
  private engagementDataSignal = signal<EngagementData[]>([]);
  private followerGrowthSignal = signal<FollowerGrowth[]>([]);
  private statsSignal = signal<AnalyticsStats | null>(null);
  private isLoadingSignal = signal(false);
  private periodSignal = signal<AnalyticsPeriod>('7d');

  // Computed signals
  readonly engagementData = computed(() => this.engagementDataSignal());
  readonly followerGrowth = computed(() => this.followerGrowthSignal());
  readonly stats = computed(() => this.statsSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly period = computed(() => this.periodSignal());

  constructor(
    http: HttpClient,
    private postService: PostService
  ) {
    super(http);
  }

  /**
   * Set the analytics period
   */
  setPeriod(period: AnalyticsPeriod): void {
    this.periodSignal.set(period);
    this.refreshAll();
  }

  /**
   * Refresh all analytics data
   */
  async refreshAll(): Promise<void> {
    this.isLoadingSignal.set(true);
    await Promise.all([
      this.getEngagementData(this.periodSignal()),
      this.getFollowerGrowth(this.periodSignal()),
      this.getStats()
    ]);
    this.isLoadingSignal.set(false);
  }

  /**
   * Get engagement analytics data from API
   * Returns empty array if API fails
   */
  async getEngagementData(period: AnalyticsPeriod = '7d'): Promise<EngagementData[]> {
    if (this.cachedEngagementData) {
      this.engagementDataSignal.set(this.cachedEngagementData);
      return this.cachedEngagementData;
    }

    try {
      const data = await this.get<EngagementData[]>(`/analytics/engagement`, { period }).toPromise();
      if (data) {
        this.cachedEngagementData = data;
        this.engagementDataSignal.set(data);
        return data;
      }
    } catch (error) {
      console.warn('Failed to fetch engagement data from API');
    }

    this.engagementDataSignal.set([]);
    return [];
  }

  /**
   * Get follower growth data from API
   * Returns empty array if API fails
   */
  async getFollowerGrowth(period: AnalyticsPeriod = '7d'): Promise<FollowerGrowth[]> {
    if (this.cachedFollowerGrowth) {
      this.followerGrowthSignal.set(this.cachedFollowerGrowth);
      return this.cachedFollowerGrowth;
    }

    try {
      const data = await this.get<FollowerGrowth[]>(`/analytics/followers`, { period }).toPromise();
      if (data) {
        this.cachedFollowerGrowth = data;
        this.followerGrowthSignal.set(data);
        return data;
      }
    } catch (error) {
      console.warn('Failed to fetch follower growth from API');
    }

    this.followerGrowthSignal.set([]);
    return [];
  }

  /**
   * Get overall analytics stats from backend API
   * Returns null if API fails
   */
  async getStats(): Promise<AnalyticsStats | null> {
    try {
      const stats = await this.get<AnalyticsStats>('/analytics/stats').toPromise();
      if (stats) {
        this.statsSignal.set(stats);
        return stats;
      }
    } catch (error) {
      console.warn('Failed to fetch analytics stats from API');
    }
    
    this.statsSignal.set(null);
    return null;
  }

  /**
   * Calculate follower growth percentage
   */
  async getFollowerGrowthPercentage(): Promise<number> {
    const data = await this.getFollowerGrowth();
    if (data.length < 2) return 0;
    const first = data[0].count;
    const last = data[data.length - 1].count;
    return Math.round(((last - first) / first) * 100 * 10) / 10;
  }

  /**
   * Get engagement trend direction
   * Compares recent 3 days vs previous 3 days
   */
  getEngagementTrend(data: EngagementData[]): 'up' | 'down' | 'stable' {
    if (data.length < 6) return 'stable';

    const recentTotal = data.slice(-3).reduce(
      (sum, d) => sum + d.likes + d.comments + d.shares, 0
    );
    const previousTotal = data.slice(0, 3).reduce(
      (sum, d) => sum + d.likes + d.comments + d.shares, 0
    );

    if (recentTotal > previousTotal * 1.1) return 'up';
    if (recentTotal < previousTotal * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Get top hashtags from local posts
   * This remains local as hashtags are extracted from post content
   */
  getTopHashtags(): { tag: string; count: number }[] {
    const posts = this.postService.posts();
    const hashtagMap = new Map<string, number>();

    posts.forEach(post => {
      const hashtags = post.content.match(/#\w+/g) || [];
      hashtags.forEach(tag => {
        const normalized = tag.toLowerCase();
        hashtagMap.set(normalized, (hashtagMap.get(normalized) || 0) + 1);
      });
    });

    return Array.from(hashtagMap.entries())
      .map(([tag, count]) => ({ tag: tag.substring(1), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Get metrics calculated from local post data
   */
  getMetrics(): AnalyticsMetrics {
    const posts = this.postService.posts();

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalReplies = posts.reduce((sum, post) => sum + post.replies, 0);
    const totalShares = posts.reduce((sum, post) => sum + post.shares, 0);

    const avgEngagementRate = totalPosts > 0
      ? Math.round(((totalLikes + totalReplies + totalShares) / totalPosts) * 10) / 10
      : 0;

    const topPost = posts.length > 0
      ? posts.reduce((max, post) =>
          (post.likes + post.replies + post.shares) >
          (max.likes + max.replies + max.shares) ? post : max
        )
      : null;

    return {
      totalPosts,
      totalLikes,
      totalReplies,
      totalShares,
      avgEngagementRate,
      topPost: topPost ? {
        id: topPost.id,
        content: topPost.content.substring(0, 50) + (topPost.content.length > 50 ? '...' : ''),
        likes: topPost.likes,
        replies: topPost.replies
      } : null
    };
  }

  /**
   * Load analytics data from API and cache results
   */
  async loadFromApi(period: string = '7d'): Promise<void> {
    try {
      const [engagement, followers, stats] = await Promise.all([
        this.get<EngagementData[]>('/analytics/engagement', { period }).toPromise(),
        this.get<FollowerGrowth[]>('/analytics/followers', { period }).toPromise(),
        this.get<AnalyticsStats>('/analytics/stats').toPromise()
      ]);
      this.cachedEngagementData = engagement || null;
      this.cachedFollowerGrowth = followers || null;
      if (stats) this.statsSignal.set(stats);
    } catch (error) {
      console.warn('Failed to load analytics from API');
    }
  }

  /**
   * Get top performing posts
   * @param period - Time period (7d, 30d, 90d)
   * @param limit - Maximum number of posts to return
   */
  async getTopPosts(period: AnalyticsPeriod = '7d', limit: number = 5): Promise<any[]> {
    if (this.cachedTopPosts) {
      return this.cachedTopPosts.slice(0, limit);
    }

    try {
      const data = await this.get<any[]>(`/analytics/top-posts`, { period, limit }).toPromise();
      if (data) {
        this.cachedTopPosts = data;
        return data.slice(0, limit);
      }
    } catch (error) {
      console.warn('Failed to fetch top posts from API');
    }

    return [];
  }

  /**
   * Get reach and impressions statistics
   * @param period - Time period (7d, 30d, 90d)
   */
  async getReachStats(period: AnalyticsPeriod = '7d'): Promise<{
    totalReach: number;
    totalImpressions: number;
    averageReach: number;
    reachGrowth: number;
  } | null> {
    try {
      const data = await this.get<any>(`/analytics/reach`, { period }).toPromise();
      if (data) {
        return data;
      }
    } catch (error) {
      console.warn('Failed to fetch reach stats from API');
    }
    
    return null;
  }

  /**
   * Compare current period to previous period
   * @param period - Current period (7d, 30d, 90d)
   */
  async compareWithPreviousPeriod(period: AnalyticsPeriod = '7d'): Promise<{
    engagementChange: number;
    followersChange: number;
    postsChange: number;
  }> {
    const data = await this.get<{
      engagementChange: number;
      followersChange: number;
      postsChange: number;
    }>(`/analytics/compare`, { period }).toPromise();

    return data ?? {
      engagementChange: 0,
      followersChange: 0,
      postsChange: 0
    };
  }
}
