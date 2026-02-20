import { Injectable, signal, computed } from '@angular/core';
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
  label: string;
  likes: number;
  replies: number;
  shares: number;
}

export interface FollowerGrowth {
  date: string;
  followers: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private mockFollowerGrowth: FollowerGrowth[] = [
    { date: 'Mon', followers: 2340 },
    { date: 'Tue', followers: 2385 },
    { date: 'Wed', followers: 2450 },
    { date: 'Thu', followers: 2520 },
    { date: 'Fri', followers: 2610 },
    { date: 'Sat', followers: 2705 },
    { date: 'Sun', followers: 2850 }
  ];

  private mockEngagementData: EngagementData[] = [
    { label: 'Mon', likes: 145, replies: 32, shares: 12 },
    { label: 'Tue', likes: 198, replies: 45, shares: 18 },
    { label: 'Wed', likes: 167, replies: 38, shares: 15 },
    { label: 'Thu', likes: 234, replies: 56, shares: 24 },
    { label: 'Fri', likes: 289, replies: 67, shares: 31 },
    { label: 'Sat', likes: 312, replies: 78, shares: 35 },
    { label: 'Sun', likes: 356, replies: 89, shares: 42 }
  ];

  constructor(private postService: PostService) {}

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

  getEngagementData(): EngagementData[] {
    return this.mockEngagementData;
  }

  getFollowerGrowth(): FollowerGrowth[] {
    return this.mockFollowerGrowth;
  }

  getFollowerGrowthPercentage(): number {
    const data = this.mockFollowerGrowth;
    if (data.length < 2) return 0;
    
    const first = data[0].followers;
    const last = data[data.length - 1].followers;
    return Math.round(((last - first) / first) * 100 * 10) / 10;
  }

  getEngagementTrend(): 'up' | 'down' | 'stable' {
    const data = this.mockEngagementData;
    if (data.length < 2) return 'stable';
    
    const recentTotal = data.slice(-3).reduce((sum, d) => sum + d.likes + d.replies + d.shares, 0);
    const previousTotal = data.slice(0, 3).reduce((sum, d) => sum + d.likes + d.replies + d.shares, 0);
    
    if (recentTotal > previousTotal * 1.1) return 'up';
    if (recentTotal < previousTotal * 0.9) return 'down';
    return 'stable';
  }

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
}
