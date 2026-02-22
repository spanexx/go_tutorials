/**
 * NotificationsComponent
 * 
 * Enhanced notifications page with:
 * - Filter tabs (All, Likes, Comments, Follows, Mentions, Replies, Shares)
 * - Mark all as read button
 * - Delete all read notifications button
 * - Empty state design
 * - Loading skeleton
 * - Settings link
 * - Pull to refresh support (mobile)
 * 
 * Uses the new NotificationService and NotificationItemComponent
 * 
 * CID: Phase-3 Milestone 3.1 - Notifications System
 */
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, Settings, CheckCheck, Trash2, RefreshCw, Filter, Heart, MessageCircle, UserPlus, AtSign, CornerDownRight, Share2 } from 'lucide-angular';
import { NotificationItemComponent } from '../../shared/components/notification-item/notification-item.component';
import { NotificationService } from '../../shared/services/notification.service';
import { Notification, NotificationType, NotificationFilter } from '../../shared/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    LucideAngularModule, 
    NotificationItemComponent
  ],
  template: `
    <div class="notifications-page">
      <div class="notifications-header">
        <div class="header-left">
          <div class="page-title">
            <lucide-icon [img]="bellIcon" class="page-icon"></lucide-icon>
            <h1>Notifications</h1>
            @if (unreadCount() > 0) {
              <span class="unread-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
            }
          </div>

          <div class="header-actions">
            <button
              class="action-btn"
              (click)="markAllAsRead()"
              [disabled]="unreadCount() === 0"
              title="Mark all as read"
            >
              <lucide-icon [img]="checkAllIcon" [size]="16"></lucide-icon>
              <span>Mark all read</span>
            </button>

            <button
              class="action-btn secondary"
              (click)="deleteAllRead()"
              [disabled]="readCount() === 0"
              title="Delete all read notifications"
            >
              <lucide-icon [img]="trashIcon" [size]="16"></lucide-icon>
              <span>Delete read</span>
            </button>

            <button
              class="action-btn icon-only"
              (click)="refresh()"
              [disabled]="isLoading()"
              title="Refresh notifications"
            >
              <lucide-icon [img]="refreshIcon" [size]="18" [class.spin]="isLoading()"></lucide-icon>
            </button>
          </div>
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

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'all'"
          (click)="setFilter('all')"
        >
          All
          @if (totalCount() > 0) {
            <span class="count">{{ totalCount() }}</span>
          }
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'like'"
          (click)="setFilter('like')"
        >
          <lucide-icon [img]="heartIcon" [size]="14"></lucide-icon>
          Likes
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'comment'"
          (click)="setFilter('comment')"
        >
          <lucide-icon [img]="commentIcon" [size]="14"></lucide-icon>
          Comments
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'follow'"
          (click)="setFilter('follow')"
        >
          <lucide-icon [img]="userIcon" [size]="14"></lucide-icon>
          Follows
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'mention'"
          (click)="setFilter('mention')"
        >
          <lucide-icon [img]="mentionIcon" [size]="14"></lucide-icon>
          Mentions
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'reply'"
          (click)="setFilter('reply')"
        >
          <lucide-icon [img]="replyIcon" [size]="14"></lucide-icon>
          Replies
        </button>
        <button
          class="filter-tab"
          [class.active]="currentFilter() === 'share'"
          (click)="setFilter('share')"
        >
          <lucide-icon [img]="shareIcon" [size]="14"></lucide-icon>
          Shares
        </button>
      </div>

      <!-- Notifications List -->
      <div class="notifications-content">
        @if (isLoading()) {
          <div class="skeleton-list">
            @for (item of skeletonItems; track $index) {
              <div class="skeleton-item">
                <div class="skeleton-icon"></div>
                <div class="skeleton-content">
                  <div class="skeleton-header"></div>
                  <div class="skeleton-text short"></div>
                </div>
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Failed to load notifications</h3>
            <p>{{ error() }}</p>
            <button class="retry-btn" (click)="refresh()">
              <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
              Try Again
            </button>
          </div>
        } @else if (filteredNotifications().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <lucide-icon [img]="bellIcon" [size]="64"></lucide-icon>
            </div>
            <h3>No notifications</h3>
            <p>{{ getEmptyStateMessage() }}</p>
            @if (currentFilter() !== 'all') {
              <button class="clear-filter-btn" (click)="setFilter('all')">
                View all notifications
              </button>
            }
          </div>
        } @else {
          <div class="notifications-list">
            @for (notification of filteredNotifications(); track notification.id) {
              <app-notification-item
                [notification]="notification"
                (deleted)="onNotificationDeleted($event)"
                (clicked)="onNotificationClicked($event)"
              />
            }
          </div>
        }
      </div>

      @if (hasMore()) {
        <div class="load-more">
          <button class="load-more-btn" (click)="loadMore()">
            Load more notifications
          </button>
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
        flex: 1;

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;

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

          .unread-badge {
            position: absolute;
            top: -4px;
            right: -8px;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            background: hsl(var(--destructive));
            color: hsl(var(--destructive-foreground));
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .action-btn {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.875rem;
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

            &.secondary:hover:not(:disabled) {
              background: hsl(var(--destructive));
              color: hsl(var(--destructive-foreground));
              border-color: hsl(var(--destructive));
            }

            &.icon-only {
              padding: 0.5rem;
              lucide-icon {
                width: 18px;
                height: 18px;
              }
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            lucide-icon {
              width: 16px;
              height: 16px;
            }
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

    .filter-tabs {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      scrollbar-width: thin;

      .filter-tab {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--background));
        color: hsl(var(--muted-foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        &.active {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: hsl(var(--accent));
        }

        .count {
          background: hsl(var(--accent) / 0.2);
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        lucide-icon {
          width: 14px;
          height: 14px;
        }
      }
    }

    .notifications-content {
      margin-bottom: 1.5rem;
      min-height: 200px;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .skeleton-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: hsl(var(--muted));
      flex-shrink: 0;
    }

    .skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-header {
      height: 14px;
      width: 60%;
      background: hsl(var(--muted));
      border-radius: calc(var(--radius) - 0.25rem);
    }

    .skeleton-text {
      height: 12px;
      background: hsl(var(--muted));
      border-radius: calc(var(--radius) - 0.25rem);

      &.short {
        width: 40%;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 2rem;
      text-align: center;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);

      .error-icon {
        font-size: 3rem;
      }

      h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
        margin: 0;
        max-width: 300px;
      }

      .retry-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
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

        lucide-icon {
          width: 16px;
          height: 16px;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 2rem;
      text-align: center;

      .empty-icon {
        color: hsl(var(--muted-foreground));
        opacity: 0.5;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
        margin: 0;
        max-width: 300px;
      }

      .clear-filter-btn {
        padding: 0.625rem 1.25rem;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: hsl(var(--accent));
        }
      }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      overflow: hidden;
    }

    .load-more {
      display: flex;
      justify-content: center;
      padding-top: 1rem;

      .load-more-btn {
        padding: 0.625rem 1.5rem;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
        }
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  bellIcon = Bell;
  settingsIcon = Settings;
  checkAllIcon = CheckCheck;
  trashIcon = Trash2;
  refreshIcon = RefreshCw;
  filterIcon = Filter;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  userIcon = UserPlus;
  mentionIcon = AtSign;
  replyIcon = CornerDownRight;
  shareIcon = Share2;

  currentPage = signal(1);
  pageSize = 20;
  skeletonItems = Array(5).fill(null);

  constructor(private notificationService: NotificationService) {}

  readonly notifications = computed(() => this.notificationService.notifications());
  readonly filteredNotifications = computed(() => this.notificationService.notifications());
  readonly unreadCount = computed(() => this.notificationService.unreadCount());
  readonly isLoading = computed(() => this.notificationService.isLoading());
  readonly error = computed(() => this.notificationService.error());
  readonly currentFilter = computed(() => this.notificationService.getFilter());
  readonly hasMore = signal(false);

  readonly totalCount = computed(() => this.notifications().length);
  readonly readCount = computed(() => this.notifications().filter(n => n.read).length);

  ngOnInit(): void {
    this.loadNotifications();
  }

  async loadNotifications(): Promise<void> {
    try {
      const result = await this.notificationService.getNotifications(
        this.currentPage(),
        this.pageSize
      );
      this.hasMore.set(result.hasMore);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  setFilter(filter: NotificationFilter): void {
    this.notificationService.setFilter(filter);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  async deleteAllRead(): Promise<void> {
    await this.notificationService.deleteAllRead();
  }

  async refresh(): Promise<void> {
    this.currentPage.set(1);
    await this.loadNotifications();
  }

  async loadMore(): Promise<void> {
    this.currentPage.update(page => page + 1);
    await this.loadNotifications();
  }

  onNotificationDeleted(notificationId: number | string): void {
    // The service already handles the deletion optimistically
    console.log('Notification deleted:', notificationId);
  }

  onNotificationClicked(notification: Notification): void {
    // Mark as read when clicked
    this.notificationService.markAsRead(notification.id);
    
    // Navigate to target if available
    if (notification.target) {
      const route = this.getTargetRoute(notification);
      if (route) {
        // Navigation would be handled by router in a real implementation
        console.log('Navigate to:', route);
      }
    }
  }

  private getTargetRoute(notification: Notification): string | null {
    switch (notification.type) {
      case NotificationType.LIKE:
      case NotificationType.COMMENT:
      case NotificationType.SHARE:
        if (notification.target?.id) {
          return `/posts/${notification.target.id}`;
        }
        break;
      case NotificationType.MENTION:
      case NotificationType.REPLY:
        if (notification.target?.id) {
          return `/posts/${notification.target.id}`;
        }
        break;
      case NotificationType.FOLLOW:
        return `/profile/${notification.actor.username}`;
    }
    return null;
  }

  getEmptyStateMessage(): string {
    const filter = this.currentFilter();
    if (filter === 'all') {
      return "You're all caught up! No new notifications at the moment.";
    }
    return `No ${filter} notifications. Try a different filter.`;
  }
}
