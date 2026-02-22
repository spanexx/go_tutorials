import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, Heart, MessageCircle, Share2, FileText, Hash, Users, BarChart3, RefreshCw, AlertTriangle } from 'lucide-angular';
import { AnalyticsService, AnalyticsMetrics, EngagementData, FollowerGrowth } from '../../shared/services/analytics.service';
import { AnalyticsOverviewCardsComponent } from '../../shared/components/analytics-overview-cards/analytics-overview-cards.component';
import { FollowerGrowthChartComponent } from '../../shared/components/follower-growth-chart/follower-growth-chart.component';
import { EngagementBreakdownChartComponent } from '../../shared/components/engagement-breakdown-chart/engagement-breakdown-chart.component';
import { TopPostsSectionComponent } from '../../shared/components/top-posts-section/top-posts-section.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AnalyticsOverviewCardsComponent, FollowerGrowthChartComponent, EngagementBreakdownChartComponent, TopPostsSectionComponent],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent {
  chartIcon = BarChart3;
  refreshIcon = RefreshCw;
  alertIcon = AlertTriangle;
  trendingUpIcon = TrendingUp;
  trendingDownIcon = TrendingDown;
  minusIcon = Minus;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  postIcon = FileText;
  hashtagIcon = Hash;
  usersIcon = Users;

  readonly periods: ('7d' | '30d' | '90d')[] = ['7d', '30d', '90d'];
  selectedPeriod = signal<'7d' | '30d' | '90d'>('7d');
  isLoading = signal(false);
  hasError = signal(false);

  metrics: AnalyticsMetrics | null = null;
  engagementData: EngagementData[] = [];
  followerGrowth: FollowerGrowth[] = [];
  followerGrowthPercent: number = 0;
  engagementTrend: 'up' | 'down' | 'stable' = 'stable';
  topHashtags: { tag: string; count: number }[] = [];

  constructor(
    private analyticsService: AnalyticsService,
    private toastService: ToastService
  ) {
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);

    try {
      this.metrics = this.analyticsService.getMetrics();
      this.engagementData = await this.analyticsService.getEngagementData();
      this.followerGrowth = await this.analyticsService.getFollowerGrowth();
      this.followerGrowthPercent = this.calculateFollowerGrowthPercentage();
      this.engagementTrend = this.analyticsService.getEngagementTrend(this.engagementData);
      this.topHashtags = this.analyticsService.getTopHashtags();
    } catch (error) {
      console.error('Failed to load analytics:', error);
      this.hasError.set(true);
      this.toastService.error('Error', 'Failed to load analytics data');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set time period
   */
  setPeriod(period: '7d' | '30d' | '90d'): void {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
  }

  /**
   * Refresh all analytics
   */
  async refreshAll(): Promise<void> {
    await this.loadAnalytics();
  }

  /**
   * Handle overview card click
   */
  onCardClick(type: 'posts' | 'followers' | 'engagement' | 'engagementRate'): void {
    this.toastService.info('Coming Soon', `Detailed ${type} analytics will be available soon`);
  }

  /**
   * Get top post safely
   */
  getTopPost(): any {
    return this.metrics?.topPost;
  }

  calculateFollowerGrowthPercentage(): number {
    if (this.followerGrowth.length < 2) return 0;
    const first = this.followerGrowth[0].count;
    const last = this.followerGrowth[this.followerGrowth.length - 1].count;
    return Math.round(((last - first) / first) * 100 * 10) / 10;
  }

  getTrendIcon(): any {
    switch (this.engagementTrend) {
      case 'up': return this.trendingUpIcon;
      case 'down': return this.trendingDownIcon;
      default: return this.minusIcon;
    }
  }

  getTrendClass(): string {
    switch (this.engagementTrend) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      default: return 'trend-stable';
    }
  }

  getMaxEngagement(): number {
    return Math.max(...this.engagementData.map(d => d.likes + d.comments + d.shares));
  }

  getMaxFollowers(): number {
    return Math.max(...this.followerGrowth.map(d => d.count));
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getAreaPath(): string {
    const points = this.getChartPoints();
    if (points.length === 0) return '';
    
    const width = 400;
    const height = 150;
    const padding = 20;
    
    let path = `M 0 ${height}`;
    
    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * width;
      path += ` L ${x} ${point.y}`;
    });
    
    path += ` L ${width} ${height} Z`;
    return path;
  }

  getLinePath(): string {
    const points = this.getChartPoints();
    if (points.length === 0) return '';
    
    const width = 400;
    let path = '';
    
    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * width;
      if (index === 0) {
        path += `M ${x} ${point.y}`;
      } else {
        path += ` L ${x} ${point.y}`;
      }
    });
    
    return path;
  }

  getChartPoints(): { x: number; y: number; label: string; value: number }[] {
    const width = 400;
    const height = 150;
    const padding = 20;
    const maxValue = this.getMaxFollowers();
    const minValue = Math.min(...this.followerGrowth.map(d => d.count));
    const range = maxValue - minValue || 1;

    return this.followerGrowth.map((data, index) => ({
      x: (index / (this.followerGrowth.length - 1)) * width,
      y: height - padding - ((data.count - minValue) / range) * (height - 2 * padding),
      label: data.date,
      value: data.count
    }));
  }
}
