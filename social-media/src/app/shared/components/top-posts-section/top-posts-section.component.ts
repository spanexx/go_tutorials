/**
 * TopPostsSectionComponent
 * 
 * Display top performing posts by various metrics:
 * - Sort by: Most liked, Most commented, Most shared, Highest reach
 * - Show top 5 posts per category
 * - Post preview with engagement stats
 * - Click to view full post
 * - Engagement rate calculation
 * - Time period indicator
 * 
 * CID: Phase-3 Milestone 3.4 - Analytics Dashboard
 */
import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Heart, MessageCircle, Share2, Eye, TrendingUp, ExternalLink } from 'lucide-angular';
import { AnalyticsService } from '../../services/analytics.service';
import { PostService, Post } from '../../services/post.service';
import { IMAGE_PLACEHOLDERS } from '../../constants/app.constants';

export type SortBy = 'liked' | 'commented' | 'shared' | 'reach';
export type ChartPeriod = '7d' | '30d' | '90d';

interface TopPost {
  id: string;
  content: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  createdAt: string;
}

@Component({
  selector: 'app-top-posts-section',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="top-posts-section">
      <!-- Section Header -->
      <div class="section-header">
        <h3 class="section-title">Top Performing Posts</h3>

        <!-- Sort Selector -->
        <div class="sort-selector">
          @for (option of sortOptions; track option.value) {
            <button
              class="sort-btn"
              [class.active]="sortBy() === option.value"
              (click)="setSortBy(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <!-- Period Indicator -->
      <div class="period-indicator">
        <span class="period-label">Showing top posts from the last</span>
        <span class="period-value">{{ selectedPeriod() }}</span>
      </div>

      <!-- Posts List -->
      <div class="posts-list">
        @if (isLoading()) {
          @for (item of [1,2,3,4,5]; track item) {
            <div class="post-card loading">
              <div class="post-header">
                <div class="author-avatar skeleton"></div>
                <div class="author-info">
                  <div class="author-name skeleton"></div>
                  <div class="author-username skeleton"></div>
                </div>
              </div>
              <div class="post-content skeleton"></div>
              <div class="post-stats">
                <div class="stat skeleton"></div>
                <div class="stat skeleton"></div>
                <div class="stat skeleton"></div>
              </div>
            </div>
          }
        } @else if (topPosts().length === 0) {
          <div class="posts-empty">
            <p>No posts found for this period</p>
          </div>
        } @else {
          @for (post of topPosts(); track post.id; let i = $index) {
            <a [routerLink]="['/feed']" class="post-card" [class.top-3]="i < 3">
              <!-- Rank Badge -->
              <div class="rank-badge" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                #{{ i + 1 }}
              </div>

              <!-- Post Header -->
              <div class="post-header">
                <img [src]="post.author.avatar" [alt]="post.author.name" class="author-avatar" />
                <div class="author-info">
                  <span class="author-name">{{ post.author.name }}</span>
                  <span class="author-username">&#64;{{ post.author.username }}</span>
                </div>
                <span class="post-date">{{ formatDate(post.createdAt) }}</span>
              </div>

              <!-- Post Content Preview -->
              <p class="post-content">{{ post.content }}</p>

              <!-- Engagement Stats -->
              <div class="post-stats">
                <div class="stat">
                  <lucide-icon [img]="heartIcon" [size]="14" class="stat-icon likes"></lucide-icon>
                  <span class="stat-value">{{ formatNumber(post.likes) }}</span>
                </div>
                <div class="stat">
                  <lucide-icon [img]="commentIcon" [size]="14" class="stat-icon comments"></lucide-icon>
                  <span class="stat-value">{{ formatNumber(post.comments) }}</span>
                </div>
                <div class="stat">
                  <lucide-icon [img]="shareIcon" [size]="14" class="stat-icon shares"></lucide-icon>
                  <span class="stat-value">{{ formatNumber(post.shares) }}</span>
                </div>
                <div class="stat">
                  <lucide-icon [img]="eyeIcon" [size]="14" class="stat-icon reach"></lucide-icon>
                  <span class="stat-value">{{ formatNumber(post.reach) }}</span>
                </div>
                <div class="stat engagement-rate">
                  <lucide-icon [img]="trendingIcon" [size]="14" class="stat-icon rate"></lucide-icon>
                  <span class="stat-value">{{ post.engagementRate.toFixed(1) }}%</span>
                </div>
              </div>

              <!-- View Full Post -->
              <div class="view-full">
                <span>View full post</span>
                <lucide-icon [img]="externalIcon" [size]="14"></lucide-icon>
              </div>
            </a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .top-posts-section {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      padding: 1.25rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;

      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;
      }

      .sort-selector {
        display: flex;
        gap: 0.25rem;
        background: hsl(var(--muted));
        padding: 0.25rem;
        border-radius: calc(var(--radius) - 0.25rem);

        .sort-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.75rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            color: hsl(var(--foreground));
          }

          &.active {
            background: hsl(var(--card));
            color: hsl(var(--foreground));
            box-shadow: 0 1px 2px hsl(var(--shadow) / 0.1);
          }
        }
      }
    }

    .period-indicator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 1.25rem;
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));

      .period-value {
        font-weight: 600;
        color: hsl(var(--foreground));
      }
    }

    .posts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .post-card {
      display: block;
      padding: 1rem;
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
      position: relative;

      &:hover {
        border-color: hsl(var(--ring));
        box-shadow: 0 4px 12px hsl(var(--shadow) / 0.1);
        transform: translateY(-2px);
      }

      &.top-3 {
        border-left: 3px solid hsl(var(--accent));
      }

      &.loading {
        pointer-events: none;
      }

      .rank-badge {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 700;

        &.gold {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
        }

        &.silver {
          background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%);
          color: white;
        }

        &.bronze {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          color: white;
        }
      }

      .post-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;

        .author-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .author-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;

          .author-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: hsl(var(--foreground));
          }

          .author-username {
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
          }
        }

        .post-date {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
      }

      .post-content {
        font-size: 0.875rem;
        color: hsl(var(--foreground));
        line-height: 1.5;
        margin-bottom: 0.875rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 0.625rem;
        background: hsl(var(--card));
        border-radius: calc(var(--radius) - 0.25rem);
        margin-bottom: 0.75rem;

        .stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));

          &.engagement-rate {
            margin-left: auto;
            font-weight: 600;
            color: hsl(var(--accent));
          }

          .stat-icon {
            width: 14px;
            height: 14px;

            &.likes { color: #ec4899; }
            &.comments { color: #3b82f6; }
            &.shares { color: #10b981; }
            &.reach { color: #6366f1; }
            &.rate { color: #f59e0b; }
          }

          .stat-value {
            font-weight: 600;
          }
        }
      }

      .view-full {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: hsl(var(--accent));
      }
    }

    .posts-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }

    /* Skeleton loading styles */
    .skeleton {
      background: linear-gradient(
        90deg,
        hsl(var(--muted)) 0%,
        hsl(var(--muted) / 0.5) 50%,
        hsl(var(--muted)) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: calc(var(--radius) - 0.25rem);

      &.author-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }

      &.author-name {
        width: 120px;
        height: 14px;
      }

      &.author-username {
        width: 80px;
        height: 12px;
      }

      &.post-content {
        width: 100%;
        height: 40px;
      }

      &.stat {
        width: 60px;
        height: 20px;
      }
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class TopPostsSectionComponent implements OnChanges {
  @Input() initialPeriod: ChartPeriod = '7d';
  
  readonly sortOptions: { value: SortBy; label: string }[] = [
    { value: 'liked', label: 'Most Liked' },
    { value: 'commented', label: 'Most Commented' },
    { value: 'shared', label: 'Most Shared' },
    { value: 'reach', label: 'Highest Reach' }
  ];

  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  eyeIcon = Eye;
  trendingIcon = TrendingUp;
  externalIcon = ExternalLink;

  selectedPeriod = signal<ChartPeriod>('7d');
  sortBy = signal<SortBy>('liked');
  topPosts = signal<TopPost[]>([]);
  isLoading = signal(false);

  constructor(
    private analyticsService: AnalyticsService,
    private postService: PostService
  ) {
    this.selectedPeriod.set(this.initialPeriod);
    this.loadTopPosts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPeriod']) {
      this.selectedPeriod.set(this.initialPeriod);
      this.loadTopPosts();
    }
  }

  /**
   * Load top posts
   */
  async loadTopPosts(): Promise<void> {
    this.isLoading.set(true);
    try {
      const posts = await this.analyticsService.getTopPosts(this.selectedPeriod(), 5);
      
      // Transform to TopPost format
      const transformedPosts: TopPost[] = posts.map(post => {
        const totalEngagement = post.likes + post.replies + post.shares;
        const reach = totalEngagement * 10; // Estimate reach
        const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

        return {
          id: post.id,
          content: post.content,
          author: {
            name: 'Current User',
            username: 'currentuser',
            avatar: IMAGE_PLACEHOLDERS.avatar
          },
          likes: post.likes,
          comments: post.replies,
          shares: post.shares,
          reach,
          engagementRate,
          createdAt: post.created_at || new Date().toISOString()
        };
      });

      this.topPosts.set(transformedPosts);
    } catch (error) {
      console.error('Failed to load top posts:', error);
      this.topPosts.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set sort method
   */
  setSortBy(sort: SortBy): void {
    this.sortBy.set(sort);
    this.sortPosts();
  }

  /**
   * Sort posts by selected metric
   */
  private sortPosts(): void {
    const sort = this.sortBy();
    const posts = [...this.topPosts()];

    switch (sort) {
      case 'liked':
        posts.sort((a, b) => b.likes - a.likes);
        break;
      case 'commented':
        posts.sort((a, b) => b.comments - a.comments);
        break;
      case 'shared':
        posts.sort((a, b) => b.shares - a.shares);
        break;
      case 'reach':
        posts.sort((a, b) => b.reach - a.reach);
        break;
    }

    this.topPosts.set(posts);
  }

  /**
   * Format number with K/M suffix
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Format date
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
