// Code Map: trending-hashtags.component.ts
// - TrendingHashtagsComponent: Displays trending hashtags in sidebar
// - Shows top 10 trending hashtags with post counts
// - Click to navigate to hashtag page
// - View all link to full hashtag list
// - Updates periodically (mock for now)
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, TrendingUp, Hash } from 'lucide-angular';
import { HashtagService, HashtagInfo } from '../../services/hashtag.service';

@Component({
  selector: 'app-trending-hashtags',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="trending-hashtags">
      <div class="trending-header">
        <div class="header-content">
          <lucide-icon [img]="trendingIcon" class="trending-icon"></lucide-icon>
          <h3>Trending Hashtags</h3>
        </div>
        <a routerLink="/explore/hashtags" class="view-all-link">View All</a>
      </div>

      <div class="trending-list">
        @for (hashtag of trendingHashtags; track hashtag.tag; let i = $index) {
          <a 
            [routerLink]="['/hashtag', hashtag.tag]" 
            class="trending-item"
            [class.top-3]="i < 3"
          >
            <div class="trending-rank" *ngIf="i < 3">
              <lucide-icon [img]="hashIcon" [size]="12"></lucide-icon>
            </div>
            <div class="trending-info">
              <p class="trending-tag">#{{ hashtag.tag }}</p>
              <p class="trending-count">{{ hashtag.count | number }} {{ hashtag.count === 1 ? 'post' : 'posts' }}</p>
            </div>
            @if (hashtag.trending) {
              <span class="trending-badge">Trending</span>
            }
          </a>
        }

        @if (trendingHashtags.length === 0 && !isLoading) {
          <p class="no-trending">No trending hashtags</p>
        }

        @if (isLoading) {
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        }
      </div>

      <div class="trending-footer">
        <a routerLink="/explore/hashtags" class="explore-link">
          Explore all hashtags
          <lucide-icon [img]="trendingIcon" [size]="14"></lucide-icon>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .trending-hashtags {
      background: hsl(var(--card));
      border-radius: var(--radius);
      border: 1px solid hsl(var(--border));
      overflow: hidden;
    }

    .trending-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);

      .header-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .trending-icon {
          width: 18px;
          height: 18px;
          color: hsl(var(--accent));
        }

        h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0;
        }
      }

      .view-all-link {
        font-size: 0.8rem;
        color: hsl(var(--accent));
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;

        &:hover {
          color: hsl(var(--accent) / 0.8);
        }
      }
    }

    .trending-list {
      .trending-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        text-decoration: none;
        color: inherit;
        border-bottom: 1px solid hsl(var(--border) / 0.5);
        transition: background 0.15s ease;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: hsl(var(--muted) / 0.5);
        }

        &.top-3 {
          background: hsl(var(--accent) / 0.05);
        }

        .trending-rank {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: hsl(var(--accent));
          flex-shrink: 0;
        }

        .trending-info {
          flex: 1;
          min-width: 0;

          .trending-tag {
            font-weight: 600;
            color: hsl(var(--foreground));
            font-size: 0.9rem;
            margin: 0 0 0.125rem 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .trending-count {
            color: hsl(var(--muted-foreground));
            font-size: 0.8rem;
            margin: 0;
          }
        }

        .trending-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: hsl(var(--accent));
          background: hsl(var(--accent) / 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: calc(var(--radius) - 0.25rem);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .no-trending {
        padding: 2rem 1.25rem;
        text-align: center;
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
      }

      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem 1.25rem;

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid hsl(var(--border));
          border-top-color: hsl(var(--accent));
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        p {
          color: hsl(var(--muted-foreground));
          font-size: 0.85rem;
          margin: 0;
        }
      }
    }

    .trending-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);

      .explore-link {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: hsl(var(--accent));
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        transition: color 0.2s;

        &:hover {
          color: hsl(var(--accent) / 0.8);
        }
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class TrendingHashtagsComponent implements OnInit, OnDestroy {
  trendingIcon = TrendingUp;
  hashIcon = Hash;

  trendingHashtags: HashtagInfo[] = [];
  isLoading = false;
  private refreshSubscription?: ReturnType<typeof setInterval>;

  constructor(private hashtagService: HashtagService) {}

  ngOnInit(): void {
    this.loadTrendingHashtags();
    
    // Refresh trending every 5 minutes (mock implementation)
    // In production, this would be handled by backend
    this.refreshSubscription = setInterval(() => {
      this.loadTrendingHashtags();
    }, 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      clearInterval(this.refreshSubscription);
    }
  }

  private loadTrendingHashtags(): void {
    this.isLoading = true;
    
    void this.hashtagService.getTrendingHashtags(10)
      .then((hashtags) => {
        this.trendingHashtags = hashtags;
        this.isLoading = false;
      })
      .catch(() => {
        this.trendingHashtags = [];
        this.isLoading = false;
      });
  }
}
