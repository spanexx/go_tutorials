import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { PostService } from './post.service';

export interface AnalyticsMetrics {
  totalPosts: number;
  totalLikes: number;
  totalReplies: number;
  totalShares: number;
  avgEngagementRate: number;
  topPost: {
    id: number;
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
  // Fallback mock data for development when API is unavailable
  private readonly fallbackFollowerGrowth: FollowerGrowth[] = [
    { date: 'Mon', count: 2340, new: 15, lost: 3 },
    { date: 'Tue', count: 2385, new: 22, lost: 4 },
    { date: 'Wed', count: 2450, new: 18, lost: 5 },
    { date: 'Thu', count: 2520, new: 31, lost: 7 },
    { date: 'Fri', count: 2610, new: 42, lost: 5 },
    { date: 'Sat', count: 2705, new: 28, lost: 2 },
    { date: 'Sun', count: 2850, new: 25, lost: 4 }
  ];

  private readonly fallbackEngagementData: EngagementData[] = [
    { date: 'Mon', likes: 145, comments: 32, shares: 12, views: 1500 },
    { date: 'Tue', likes: 198, comments: 45, shares: 18, views: 1800 },
    { date: 'Wed', likes: 167, comments: 38, shares: 15, views: 1200 },
    { date: 'Thu', likes: 234, comments: 56, shares: 24, views: 2100 },
    { date: 'Fri', likes: 289, comments: 67, shares: 31, views: 2800 },
    { date: 'Sat', likes: 312, comments: 78, shares: 35, views: 2300 },
    { date: 'Sun', likes: 356, comments: 89, shares: 42, views: 1900 }
  ];

  // Cached API data
  private cachedEngagementData: EngagementData[] | null = null;
  private cachedFollowerGrowth: FollowerGrowth[] | null = null;

  constructor(
    http: HttpClient,
    private postService: PostService
  ) {
    super(http);
  }

  /**
   * Get engagement analytics data
   * Uses cached API data if available, otherwise falls back to mock data
   */
  getEngagementData(period: string = '7d'): EngagementData[] {
    if (this.cachedEngagementData) {
      return this.cachedEngagementData;
    }
    // For now, return fallback data
    // In full implementation, this would call the API and cache the result
    return this.fallbackEngagementData;
  }

  /**
   * Get follower growth data
   * Uses cached API data if available, otherwise falls back to mock data
   */
  getFollowerGrowth(period: string = '7d'): FollowerGrowth[] {
    if (this.cachedFollowerGrowth) {
      return this.cachedFollowerGrowth;
    }
    // For now, return fallback data
    // In full implementation, this would call the API and cache the result
    return this.fallbackFollowerGrowth;
  }

  /**
   * Get overall analytics stats from backend
   */
  getStats(): AnalyticsStats {
    // In full implementation, fetch from API
    return {
      total_posts: 156,
      total_likes: 2847,
      total_comments: 523,
      total_shares: 189,
      total_followers: 2850,
      total_following: 245,
      engagement_rate: 4.2
    };
  }

  /**
   * Calculate follower growth percentage
   */
  getFollowerGrowthPercentage(): number {
    const data = this.getFollowerGrowth();
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
   * Load analytics data from API (for future use)
   * This method would be called to refresh cached data
   */
  async loadFromApi(period: string = '7d'): Promise<void> {
    try {
      // In full implementation, fetch from API and cache results
      // const [engagement, followers] = await Promise.all([
      //   this.get<EngagementData[]>('/analytics/engagement', { period }).toPromise(),
      //   this.get<FollowerGrowth[]>('/analytics/followers', { period }).toPromise()
      // ]);
      // this.cachedEngagementData = engagement;
      // this.cachedFollowerGrowth = followers;
    } catch (error) {
      console.warn('Failed to load analytics from API, using fallback data');
    }
  }
}
