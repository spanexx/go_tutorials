import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, Heart, MessageCircle, Share2, FileText, Hash, Users, BarChart3 } from 'lucide-angular';
import { AnalyticsService, AnalyticsMetrics, EngagementData, FollowerGrowth } from '../../shared/services/analytics.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent {
  trendingUpIcon = TrendingUp;
  trendingDownIcon = TrendingDown;
  minusIcon = Minus;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  postIcon = FileText;
  hashtagIcon = Hash;
  usersIcon = Users;
  chartIcon = BarChart3;

  metrics: AnalyticsMetrics | null = null;
  engagementData: EngagementData[] = [];
  followerGrowth: FollowerGrowth[] = [];
  followerGrowthPercent: number = 0;
  engagementTrend: 'up' | 'down' | 'stable' = 'stable';
  topHashtags: { tag: string; count: number }[] = [];

  constructor(private analyticsService: AnalyticsService) {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.metrics = this.analyticsService.getMetrics();
    this.engagementData = this.analyticsService.getEngagementData();
    this.followerGrowth = this.analyticsService.getFollowerGrowth();
    this.followerGrowthPercent = this.calculateFollowerGrowthPercentage();
    this.engagementTrend = this.analyticsService.getEngagementTrend(this.engagementData);
    this.topHashtags = this.analyticsService.getTopHashtags();
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
