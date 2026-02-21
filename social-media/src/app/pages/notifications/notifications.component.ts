// Code Map: notifications.component.ts
// - NotificationsComponent: Dedicated activity/notifications page
// - Route: /notifications or /activity
// - Activity feed component as main content
// - Filter tabs by activity type
// - Mark all as read button
// - Settings link for notification preferences (placeholder)
// - Empty state when no activity
// - Loading and error states
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, Settings, CheckCheck } from 'lucide-angular';
import { ActivityFeedComponent } from '../../shared/activity-feed/activity-feed.component';
import { ActivityService } from '../../shared/services/activity.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ActivityFeedComponent],
  template: `
    <div class="notifications-page">
      <div class="notifications-header">
        <div class="header-left">
          <div class="page-title">
            <lucide-icon [img]="bellIcon" class="page-icon"></lucide-icon>
            <h1>Notifications</h1>
          </div>
          
          <button 
            class="mark-all-btn" 
            (click)="markAllAsRead()"
            [disabled]="unreadCount === 0"
            title="Mark all as read"
          >
            <lucide-icon [img]="checkAllIcon" [size]="18"></lucide-icon>
            <span>Mark all read</span>
          </button>
        </div>

        <a 
          routerLink="/settings/notifications" 
          class="settings-link"
          title="Notification settings"
        >
          <lucide-icon [img]="settingsIcon" [size]="20"></lucide-icon>
          <span class="settings-label">Settings</span>
        </a>
      </div>

      <div class="notifications-content">
        <app-activity-feed></app-activity-feed>
      </div>

      @if (isLoading) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      }

      @if (hasError) {
        <div class="error-state">
          <p>Failed to load notifications</p>
          <button (click)="retry()">Retry</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
      min-height: 100vh;
    }

    .notifications-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          .page-icon {
            width: 28px;
            height: 28px;
            color: hsl(var(--accent));
          }

          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: hsl(var(--foreground));
            margin: 0;
          }
        }

        .mark-all-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &:hover:not(:disabled) {
            background: hsl(var(--accent));
            color: hsl(var(--accent-foreground));
            border-color: hsl(var(--accent));
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          lucide-icon {
            width: 18px;
            height: 18px;
          }
        }
      }

      .settings-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--background));
        color: hsl(var(--muted-foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .settings-label {
          @media (max-width: 640px) {
            display: none;
          }
        }
      }
    }

    .notifications-content {
      margin-bottom: 1.5rem;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 1000;

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid hsl(var(--border));
        border-top-color: hsl(var(--accent));
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      p {
        color: hsl(var(--foreground));
        font-size: 1rem;
        font-weight: 500;
      }
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem;
      text-align: center;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);

      p {
        color: hsl(var(--muted-foreground));
        font-size: 1rem;
        margin: 0;
      }

      button {
        padding: 0.5rem 1.5rem;
        border: none;
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          opacity: 0.9;
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
export class NotificationsComponent {
  bellIcon = Bell;
  settingsIcon = Settings;
  checkAllIcon = CheckCheck;

  isLoading = false;
  hasError = false;

  constructor(private activityService: ActivityService) {}

  get unreadCount(): number {
    return this.activityService.unreadCount();
  }

  markAllAsRead(): void {
    this.activityService.markAllAsRead();
  }

  async loadNotifications(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;

    try {
      await this.activityService.refresh();
    } catch (error) {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  retry(): void {
    this.loadNotifications();
  }
}
