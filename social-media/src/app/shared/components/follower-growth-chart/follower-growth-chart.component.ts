/**
 * FollowerGrowthChartComponent
 * 
 * Line chart showing follower growth over time:
 * - Line chart showing follower count over time
 * - X-axis: dates (daily points)
 * - Y-axis: follower count
 * - Hover to see exact count on specific date
 * - Time range selector (7d, 30d, 90d)
 * - Smooth curve rendering
 * - Legend and axis labels
 * 
 * CID: Phase-3 Milestone 3.4 - Analytics Dashboard
 */
import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus } from 'lucide-angular';
import { AnalyticsService, FollowerGrowth } from '../../services/analytics.service';

export type ChartPeriod = '7d' | '30d' | '90d';

interface ChartPoint {
  date: string;
  count: number;
  new: number;
  lost: number;
  x: number;
  y: number;
}

interface ChartDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

@Component({
  selector: 'app-follower-growth-chart',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="follower-growth-chart">
      <!-- Chart Header -->
      <div class="chart-header">
        <div class="header-left">
          <h3 class="chart-title">Follower Growth</h3>
          @if (totalGrowth() !== 0) {
            <div class="growth-indicator" [class]="'growth-' + growthTrend()">
              @switch (growthTrend()) {
                @case ('up') {
                  <lucide-icon [img]="trendingUpIcon" [size]="16"></lucide-icon>
                }
                @case ('down') {
                  <lucide-icon [img]="trendingDownIcon" [size]="16"></lucide-icon>
                }
                @default {
                  <lucide-icon [img]="minusIcon" [size]="16"></lucide-icon>
                }
              }
              <span>{{ formatGrowth(totalGrowth()) }}</span>
            </div>
          }
        </div>

        <!-- Period Selector -->
        <div class="period-selector">
          @for (period of periods; track period) {
            <button
              class="period-btn"
              [class.active]="selectedPeriod() === period"
              (click)="setPeriod(period)"
            >
              {{ period }}
            </button>
          }
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-container">
        @if (isLoading()) {
          <div class="chart-loading">
            <div class="loading-spinner"></div>
            <span>Loading chart...</span>
          </div>
        } @else if (chartPoints().length === 0) {
          <div class="chart-empty">
            <p>No follower data available</p>
          </div>
        } @else {
          <svg
            class="chart-svg"
            [attr.viewBox]="'0 0 ' + dimensions().width + ' ' + dimensions().height"
            preserveAspectRatio="xMidYMid meet"
          >
            <!-- Grid Lines -->
            <g class="chart-grid">
              @for (line of yGridLines(); track line.value) {
                <line
                  [attr.x1]="dimensions().padding.left"
                  [attr.y1]="line.y"
                  [attr.x2]="dimensions().width - dimensions().padding.right"
                  [attr.y2]="line.y"
                  class="grid-line"
                />
                <text
                  [attr.x]="dimensions().padding.left - 8"
                  [attr.y]="line.y + 4"
                  class="grid-label"
                  text-anchor="end"
                >
                  {{ formatYAxisLabel(line.value) }}
                </text>
              }
            </g>

            <!-- X-axis Labels -->
            <g class="chart-x-axis">
              @for (point of xAxisLabels(); track point.date) {
                <text
                  [attr.x]="point.x"
                  [attr.y]="dimensions().height - dimensions().padding.bottom + 20"
                  class="x-axis-label"
                  text-anchor="middle"
                >
                  {{ point.date }}
                </text>
              }
            </g>

            <!-- Area Fill -->
            <path
              [attr.d]="areaPath()"
              class="chart-area"
              [style.fill]="areaColor + '20'"
            />

            <!-- Line Path -->
            <path
              [attr.d]="linePath()"
              class="chart-line"
              [style.stroke]="lineColor"
            />

            <!-- Data Points -->
            @for (point of chartPoints(); track point.date; let i = $index) {
              <g class="chart-point-group">
                <circle
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="5"
                  class="chart-point"
                  [style.fill]="lineColor"
                />
                <!-- Tooltip -->
                <g class="chart-tooltip" [attr.transform]="'translate(' + point.x + ',' + (point.y - 50) + ')'">
                  <rect x="-60" y="-35" width="120" height="35" rx="4" class="tooltip-bg" />
                  <text x="0" y="-18" text-anchor="middle" class="tooltip-date">{{ point.date }}</text>
                  <text x="0" y="0" text-anchor="middle" class="tooltip-value">{{ formatNumber(point.count) }} followers</text>
                </g>
              </g>
            }
          </svg>
        }
      </div>

      <!-- Chart Legend -->
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color" [style.background]="lineColor"></span>
          <span class="legend-label">Followers</span>
        </div>
        <div class="legend-item">
          <span class="legend-stat">Start: {{ formatNumber(startCount()) }}</span>
        </div>
        <div class="legend-item">
          <span class="legend-stat">End: {{ formatNumber(endCount()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .follower-growth-chart {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      padding: 1.25rem;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;

      .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0;
        }

        .growth-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;

          lucide-icon {
            width: 16px;
            height: 16px;
          }

          &.growth-up {
            background: hsl(var(--success) / 0.1);
            color: hsl(var(--success));
          }

          &.growth-down {
            background: hsl(var(--destructive) / 0.1);
            color: hsl(var(--destructive));
          }

          &.growth-stable {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
          }
        }
      }

      .period-selector {
        display: flex;
        gap: 0.25rem;
        background: hsl(var(--muted));
        padding: 0.25rem;
        border-radius: calc(var(--radius) - 0.25rem);

        .period-btn {
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

    .chart-container {
      position: relative;
      width: 100%;
      height: 280px;
      min-height: 200px;

      .chart-loading, .chart-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid hsl(var(--border));
          border-top-color: hsl(var(--accent));
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 0.5rem;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .chart-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .chart-grid {
      .grid-line {
        stroke: hsl(var(--border));
        stroke-width: 1;
        stroke-dasharray: 4 4;
      }

      .grid-label {
        fill: hsl(var(--muted-foreground));
        font-size: 11px;
        font-weight: 500;
      }
    }

    .chart-x-axis {
      .x-axis-label {
        fill: hsl(var(--muted-foreground));
        font-size: 11px;
        font-weight: 500;
      }
    }

    .chart-area {
      transition: all 0.3s ease;
    }

    .chart-line {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: all 0.3s ease;
    }

    .chart-point {
      opacity: 0;
      transition: opacity 0.2s;
      cursor: pointer;

      &:hover {
        opacity: 1;
        r: 7;
      }
    }

    .chart-point-group:hover .chart-point {
      opacity: 1;
    }

    .chart-tooltip {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      transform-origin: center bottom;

      .chart-point-group:hover & {
        opacity: 1;
      }

      .tooltip-bg {
        fill: hsl(var(--card));
        stroke: hsl(var(--border));
        stroke-width: 1;
        filter: drop-shadow(0 4px 6px hsl(var(--shadow) / 0.1));
      }

      .tooltip-date {
        fill: hsl(var(--muted-foreground));
        font-size: 10px;
        font-weight: 500;
      }

      .tooltip-value {
        fill: hsl(var(--foreground));
        font-size: 12px;
        font-weight: 600;
      }
    }

    .chart-legend {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid hsl(var(--border));
      flex-wrap: wrap;
      gap: 1rem;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .legend-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
        }

        .legend-stat {
          font-size: 0.75rem;
          font-weight: 500;
          color: hsl(var(--foreground));
        }
      }
    }
  `]
})
export class FollowerGrowthChartComponent implements OnChanges {
  trendingUpIcon = TrendingUp;
  trendingDownIcon = TrendingDown;
  minusIcon = Minus;

  @Input() initialPeriod: ChartPeriod = '7d';
  
  readonly periods: ChartPeriod[] = ['7d', '30d', '90d'];
  readonly lineColor = '#10b981';
  readonly areaColor = '#10b981';

  selectedPeriod = signal<ChartPeriod>('7d');
  followerData = signal<FollowerGrowth[]>([]);
  isLoading = signal(false);

  dimensions = computed<ChartDimensions>(() => ({
    width: 800,
    height: 280,
    padding: { top: 20, right: 20, bottom: 40, left: 60 }
  }));

  chartPoints = computed<ChartPoint[]>(() => {
    const data = this.followerData();
    if (data.length === 0) return [];

    const dims = this.dimensions();
    const chartWidth = dims.width - dims.padding.left - dims.padding.right;
    const chartHeight = dims.height - dims.padding.top - dims.padding.bottom;

    const minCount = Math.min(...data.map(d => d.count));
    const maxCount = Math.max(...data.map(d => d.count));
    const countRange = maxCount - minCount || 1;

    return data.map((d, i) => ({
      date: d.date,
      count: d.count,
      new: d.new,
      lost: d.lost,
      x: dims.padding.left + (i / (data.length - 1)) * chartWidth,
      y: dims.padding.top + chartHeight - ((d.count - minCount) / countRange) * chartHeight
    }));
  });

  yGridLines = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return [];

    const dims = this.dimensions();
    const chartHeight = dims.height - dims.padding.top - dims.padding.bottom;
    const counts = points.map(p => p.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min || 1;

    return [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const value = Math.round(min + range * ratio);
      const y = dims.padding.top + chartHeight - ratio * chartHeight;
      return { value, y };
    });
  });

  xAxisLabels = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return [];

    // Show labels for first, middle, and last points
    const indices = [0, Math.floor(points.length / 2), points.length - 1];
    return indices.filter((i, idx, arr) => arr.indexOf(i) === idx)
      .map(i => ({
        date: this.formatXAxisLabel(points[i].date),
        x: points[i].x
      }));
  });

  linePath = computed(() => {
    const points = this.chartPoints();
    if (points.length < 2) return '';

    // Create smooth curve using quadratic bezier curves
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return path;
  });

  areaPath = computed(() => {
    const points = this.chartPoints();
    if (points.length < 2) return '';

    const dims = this.dimensions();
    const chartBottom = dims.height - dims.padding.bottom;

    let path = `M ${points[0].x} ${chartBottom}`;
    path += ` L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }

    path += ` L ${points[points.length - 1].x} ${chartBottom} Z`;
    return path;
  });

  totalGrowth = computed(() => {
    const points = this.chartPoints();
    if (points.length < 2) return 0;
    const start = points[0].count;
    const end = points[points.length - 1].count;
    return Math.round(((end - start) / start) * 100 * 10) / 10;
  });

  growthTrend = computed(() => {
    const growth = this.totalGrowth();
    if (growth > 2) return 'up';
    if (growth < -2) return 'down';
    return 'stable';
  });

  startCount = computed(() => {
    const points = this.chartPoints();
    return points.length > 0 ? points[0].count : 0;
  });

  endCount = computed(() => {
    const points = this.chartPoints();
    return points.length > 0 ? points[points.length - 1].count : 0;
  });

  constructor(private analyticsService: AnalyticsService) {
    this.selectedPeriod.set(this.initialPeriod);
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPeriod']) {
      this.selectedPeriod.set(this.initialPeriod);
      this.loadData();
    }
  }

  /**
   * Load follower data
   */
  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.analyticsService.getFollowerGrowth(this.selectedPeriod());
      this.followerData.set(data);
    } catch (error) {
      console.error('Failed to load follower growth data:', error);
      this.followerData.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set time period
   */
  setPeriod(period: ChartPeriod): void {
    this.selectedPeriod.set(period);
    this.loadData();
  }

  /**
   * Format growth percentage
   */
  formatGrowth(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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
   * Format Y-axis label
   */
  formatYAxisLabel(value: number): string {
    return this.formatNumber(value);
  }

  /**
   * Format X-axis label (date)
   */
  formatXAxisLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const period = this.selectedPeriod();
    
    if (period === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    if (period === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
