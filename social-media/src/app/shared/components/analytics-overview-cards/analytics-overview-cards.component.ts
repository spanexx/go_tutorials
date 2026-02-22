/**
 * AnalyticsOverviewCardsComponent
 * 
 * Summary cards showing key analytics metrics at a glance:
 * - Total posts card with count and trend
 * - Total followers card with growth indicator
 * - Total engagement card (likes + comments + shares)
 * - Average engagement rate card
 * - Trend indicators (up/down arrows with percentages)
 * - Click cards to see detailed view
 * 
 * CID: Phase-3 Milestone 3.4 - Analytics Dashboard
 */
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, Heart, Users, Share2, MessageCircle, BarChart3 } from 'lucide-angular';
import { AnalyticsService, AnalyticsStats } from '../../services/analytics.service';

export interface OverviewCardData {
  type: 'posts' | 'followers' | 'engagement' | 'engagementRate';
  title: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  icon: any;
  color: string;
}

@Component({
  selector: 'app-analytics-overview-cards',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="analytics-overview-cards">
      @for (card of cards(); track card.type) {
        <div
          class="overview-card"
          [class]="card.type"
          [class.clickable]="clickable"
          (click)="onCardClick(card.type)"
        >
          <div class="card-header">
            <div class="card-icon" [style.background]="card.color + '20'" [style.color]="card.color">
              <lucide-icon [img]="card.icon" [size]="20"></lucide-icon>
            </div>
            <div class="card-trend" [class]="'trend-' + card.trend">
              @switch (card.trend) {
                @case ('up') {
                  <lucide-icon [img]="trendingUpIcon" [size]="14"></lucide-icon>
                }
                @case ('down') {
                  <lucide-icon [img]="trendingDownIcon" [size]="14"></lucide-icon>
                }
                @default {
                  <lucide-icon [img]="minusIcon" [size]="14"></lucide-icon>
                }
              }
              <span class="trend-value">{{ formatTrendValue(card.trendValue) }}</span>
            </div>
          </div>

          <div class="card-content">
            <div class="card-title">{{ card.title }}</div>
            <div class="card-value">{{ formatValue(card.value, card.type) }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics-overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .overview-card {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      padding: 1.25rem;
      transition: all 0.2s ease;

      &.clickable {
        cursor: pointer;

        &:hover {
          border-color: hsl(var(--ring));
          box-shadow: 0 4px 12px hsl(var(--shadow) / 0.1);
          transform: translateY(-2px);
        }
      }

      .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1rem;

        .card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: calc(var(--radius) - 0.25rem);

          lucide-icon {
            width: 20px;
            height: 20px;
          }
        }

        .card-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;

          lucide-icon {
            width: 14px;
            height: 14px;
          }

          &.trend-up {
            background: hsl(var(--success) / 0.1);
            color: hsl(var(--success));
          }

          &.trend-down {
            background: hsl(var(--destructive) / 0.1);
            color: hsl(var(--destructive));
          }

          &.trend-stable {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
          }

          .trend-value {
            white-space: nowrap;
          }
        }
      }

      .card-content {
        .card-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.375rem;
        }

        .card-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          line-height: 1.2;
        }
      }
    }
  `]
})
export class AnalyticsOverviewCardsComponent {
  trendingUpIcon = TrendingUp;
  trendingDownIcon = TrendingDown;
  minusIcon = Minus;
  heartIcon = Heart;
  usersIcon = Users;
  shareIcon = Share2;
  commentIcon = MessageCircle;
  chartIcon = BarChart3;

  @Input() period: '7d' | '30d' | '90d' = '7d';
  @Input() clickable = true;
  @Output() cardClick = new EventEmitter<'posts' | 'followers' | 'engagement' | 'engagementRate'>();

  stats = signal<AnalyticsStats | null>(null);
  comparison = signal<{ engagementChange: number; followersChange: number; postsChange: number } | null>(null);

  cards = computed<OverviewCardData[]>(() => {
    const statsData = this.stats();
    const comparisonData = this.comparison();

    if (!statsData) {
      return [];
    }

    return [
      {
        type: 'posts',
        title: 'Total Posts',
        value: statsData.total_posts,
        trend: this.getTrend(comparisonData?.postsChange || 0),
        trendValue: comparisonData?.postsChange || 0,
        icon: this.chartIcon,
        color: '#6366f1'
      },
      {
        type: 'followers',
        title: 'Total Followers',
        value: statsData.total_followers,
        trend: this.getTrend(comparisonData?.followersChange || 0),
        trendValue: comparisonData?.followersChange || 0,
        icon: this.usersIcon,
        color: '#10b981'
      },
      {
        type: 'engagement',
        title: 'Total Engagement',
        value: statsData.total_likes + statsData.total_comments + statsData.total_shares,
        trend: this.getTrend(comparisonData?.engagementChange || 0),
        trendValue: comparisonData?.engagementChange || 0,
        icon: this.heartIcon,
        color: '#ec4899'
      },
      {
        type: 'engagementRate',
        title: 'Engagement Rate',
        value: statsData.engagement_rate,
        trend: 'stable',
        trendValue: 0,
        icon: this.shareIcon,
        color: '#f59e0b'
      }
    ];
  });

  constructor(private analyticsService: AnalyticsService) {
    this.loadStats();
  }

  /**
   * Load analytics stats
   */
  async loadStats(): Promise<void> {
    const stats = await this.analyticsService.getStats();
    this.stats.set(stats);

    const comparison = await this.analyticsService.compareWithPreviousPeriod(this.period);
    this.comparison.set(comparison);
  }

  /**
   * Get trend direction from percentage change
   */
  private getTrend(change: number): 'up' | 'down' | 'stable' {
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'stable';
  }

  /**
   * Format trend value with + or - sign
   */
  formatTrendValue(value: number): string {
    if (value === 0) return 'No change';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  /**
   * Format card value based on type
   */
  formatValue(value: number | string, type: OverviewCardData['type']): string {
    if (typeof value === 'string') return value;

    switch (type) {
      case 'engagementRate':
        return `${value.toFixed(1)}%`;
      case 'followers':
      case 'engagement':
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toString();
      default:
        return value.toString();
    }
  }

  /**
   * Handle card click
   */
  onCardClick(type: OverviewCardData['type']): void {
    if (this.clickable) {
      this.cardClick.emit(type);
    }
  }
}
