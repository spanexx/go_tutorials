/**
 * EngagementBreakdownChartComponent
 * 
 * Stacked bar chart showing engagement breakdown over time:
 * - Bar or stacked bar chart
 * - Categories: Likes, Comments, Shares
 * - Time-based grouping (daily/weekly)
 * - Color-coded by engagement type
 * - Hover for exact values
 * - Time range selector
 * 
 * CID: Phase-3 Milestone 3.4 - Analytics Dashboard
 */
import { Component, Input, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, EngagementData } from '../../services/analytics.service';

export type ChartPeriod = '7d' | '30d' | '90d';

interface ChartBar {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  total: number;
  x: number;
  y: number;
  height: number;
  likesHeight: number;
  commentsHeight: number;
  sharesHeight: number;
}

interface ChartDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

@Component({
  selector: 'app-engagement-breakdown-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="engagement-breakdown-chart">
      <!-- Chart Header -->
      <div class="chart-header">
        <h3 class="chart-title">Engagement Breakdown</h3>

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
        } @else if (chartBars().length === 0) {
          <div class="chart-empty">
            <p>No engagement data available</p>
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
              @for (label of xAxisLabels(); track label.date) {
                <text
                  [attr.x]="label.x"
                  [attr.y]="dimensions().height - dimensions().padding.bottom + 20"
                  class="x-axis-label"
                  text-anchor="middle"
                >
                  {{ label.date }}
                </text>
              }
            </g>

            <!-- Stacked Bars -->
            @for (bar of chartBars(); track bar.date; let i = $index) {
              <g class="chart-bar-group">
                <!-- Likes Bar (bottom) -->
                <rect
                  [attr.x]="bar.x - barWidth() / 2"
                  [attr.y]="bar.y + bar.commentsHeight + bar.sharesHeight"
                  [attr.width]="barWidth()"
                  [attr.height]="bar.likesHeight"
                  class="bar-segment likes"
                  [attr.data-value]="bar.likes"
                />
                
                <!-- Comments Bar (middle) -->
                <rect
                  [attr.x]="bar.x - barWidth() / 2"
                  [attr.y]="bar.y + bar.sharesHeight"
                  [attr.width]="barWidth()"
                  [attr.height]="bar.commentsHeight"
                  class="bar-segment comments"
                  [attr.data-value]="bar.comments"
                />
                
                <!-- Shares Bar (top) -->
                <rect
                  [attr.x]="bar.x - barWidth() / 2"
                  [attr.y]="bar.y"
                  [attr.width]="barWidth()"
                  [attr.height]="bar.sharesHeight"
                  class="bar-segment shares"
                  [attr.data-value]="bar.shares"
                />

                <!-- Tooltip Group -->
                <g class="chart-tooltip" [attr.transform]="'translate(' + bar.x + ',' + (bar.y - 80) + ')'">
                  <rect x="-70" y="-55" width="140" height="55" rx="4" class="tooltip-bg" />
                  <text x="0" y="-38" text-anchor="middle" class="tooltip-date">{{ bar.date }}</text>
                  <text x="-45" y="-20" text-anchor="end" class="tooltip-likes">❤️ {{ bar.likes }}</text>
                  <text x="-45" y="-5" text-anchor="end" class="tooltip-comments">💬 {{ bar.comments }}</text>
                  <text x="-45" y="10" text-anchor="end" class="tooltip-shares">↗️ {{ bar.shares }}</text>
                  <text x="45" y="-10" text-anchor="start" class="tooltip-total">Total: {{ bar.total }}</text>
                </g>
              </g>
            }
          </svg>
        }
      </div>

      <!-- Chart Legend -->
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color likes"></span>
          <span class="legend-label">Likes</span>
        </div>
        <div class="legend-item">
          <span class="legend-color comments"></span>
          <span class="legend-label">Comments</span>
        </div>
        <div class="legend-item">
          <span class="legend-color shares"></span>
          <span class="legend-label">Shares</span>
        </div>
        <div class="legend-item">
          <span class="legend-stat">Total: {{ formatNumber(totalEngagement()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .engagement-breakdown-chart {
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

      .chart-title {
        font-size: 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;
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

    .chart-bar-group {
      cursor: pointer;

      .bar-segment {
        transition: opacity 0.2s;
        opacity: 0.9;

        &:hover {
          opacity: 1;
        }

        &.likes {
          fill: #ec4899;
        }

        &.comments {
          fill: #3b82f6;
        }

        &.shares {
          fill: #10b981;
        }
      }

      .chart-tooltip {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        transform-origin: center bottom;

        &:hover {
          opacity: 1;
        }

        .chart-bar-group:hover & {
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

        .tooltip-likes, .tooltip-comments, .tooltip-shares {
          fill: hsl(var(--foreground));
          font-size: 11px;
          font-weight: 600;
        }

        .tooltip-total {
          fill: hsl(var(--accent));
          font-size: 12px;
          font-weight: 700;
        }
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

          &.likes {
            background: #ec4899;
          }

          &.comments {
            background: #3b82f6;
          }

          &.shares {
            background: #10b981;
          }
        }

        .legend-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
        }

        .legend-stat {
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(var(--accent));
        }
      }
    }
  `]
})
export class EngagementBreakdownChartComponent implements OnChanges {
  @Input() initialPeriod: ChartPeriod = '7d';
  
  readonly periods: ChartPeriod[] = ['7d', '30d', '90d'];
  
  selectedPeriod = signal<ChartPeriod>('7d');
  engagementData = signal<EngagementData[]>([]);
  isLoading = signal(false);

  dimensions = computed<ChartDimensions>(() => ({
    width: 800,
    height: 280,
    padding: { top: 20, right: 20, bottom: 40, left: 60 }
  }));

  chartBars = computed<ChartBar[]>(() => {
    const data = this.engagementData();
    if (data.length === 0) return [];

    const dims = this.dimensions();
    const chartWidth = dims.width - dims.padding.left - dims.padding.right;
    const chartHeight = dims.height - dims.padding.top - dims.padding.bottom;

    const maxTotal = Math.max(...data.map(d => d.likes + d.comments + d.shares));
    const barSpacing = chartWidth / data.length;
    const barWidth = barSpacing * 0.6;

    return data.map((d, i) => {
      const total = d.likes + d.comments + d.shares;
      const totalHeight = maxTotal > 0 ? (total / maxTotal) * chartHeight : 0;
      const likesHeight = total > 0 ? (d.likes / total) * totalHeight : 0;
      const commentsHeight = total > 0 ? (d.comments / total) * totalHeight : 0;
      const sharesHeight = total > 0 ? (d.shares / total) * totalHeight : 0;

      return {
        date: d.date,
        likes: d.likes,
        comments: d.comments,
        shares: d.shares,
        total,
        x: dims.padding.left + (i + 0.5) * barSpacing,
        y: dims.padding.top + chartHeight - totalHeight,
        height: totalHeight,
        likesHeight,
        commentsHeight,
        sharesHeight
      };
    });
  });

  barWidth = computed(() => {
    const bars = this.chartBars();
    if (bars.length === 0) return 0;
    const dims = this.dimensions();
    const chartWidth = dims.width - dims.padding.left - dims.padding.right;
    return (chartWidth / bars.length) * 0.6;
  });

  yGridLines = computed(() => {
    const bars = this.chartBars();
    if (bars.length === 0) return [];

    const dims = this.dimensions();
    const chartHeight = dims.height - dims.padding.top - dims.padding.bottom;
    const maxTotal = Math.max(...bars.map(b => b.total));

    return [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const value = Math.round(maxTotal * ratio);
      const y = dims.padding.top + chartHeight - ratio * chartHeight;
      return { value, y };
    });
  });

  xAxisLabels = computed(() => {
    const bars = this.chartBars();
    if (bars.length === 0) return [];

    // Show labels for first, middle, and last bars
    const indices = [0, Math.floor(bars.length / 2), bars.length - 1];
    return indices.filter((i, idx, arr) => arr.indexOf(i) === idx)
      .map(i => ({
        date: this.formatXAxisLabel(bars[i].date),
        x: bars[i].x
      }));
  });

  totalEngagement = computed(() => {
    const bars = this.chartBars();
    return bars.reduce((sum, bar) => sum + bar.total, 0);
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
   * Load engagement data
   */
  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.analyticsService.getEngagementData(this.selectedPeriod());
      this.engagementData.set(data);
    } catch (error) {
      console.error('Failed to load engagement data:', error);
      this.engagementData.set([]);
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
