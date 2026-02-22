import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Heart, MessageCircle, Share2, UserPlus, AtSign, CornerDownRight, X, ExternalLink } from 'lucide-angular';
import { Notification, NotificationType } from '../../models/notification.model';

/**
 * NotificationItemComponent
 * 
 * Displays an individual notification item with:
 * - Actor avatar and name
 * - Notification message based on type
 * - Target preview (post/comment snippet)
 * - Relative timestamp
 * - Unread indicator
 * - Delete action
 * - Click to navigate to relevant content
 * 
 * CID: Phase-3 Milestone 3.1 - Notifications System
 */
@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div
      class="notification-item"
      [class.unread]="!notification.read"
      [class.read]="notification.read"
      (click)="navigateToTarget()"
    >
      <div class="notification-icon">
        @switch (notification.type) {
          @case ('like') {
            <lucide-icon [img]="heartIcon" class="icon-like"></lucide-icon>
          }
          @case ('comment') {
            <lucide-icon [img]="commentIcon" class="icon-comment"></lucide-icon>
          }
          @case ('follow') {
            <lucide-icon [img]="followIcon" class="icon-follow"></lucide-icon>
          }
          @case ('mention') {
            <lucide-icon [img]="mentionIcon" class="icon-mention"></lucide-icon>
          }
          @case ('reply') {
            <lucide-icon [img]="replyIcon" class="icon-reply"></lucide-icon>
          }
          @case ('share') {
            <lucide-icon [img]="shareIcon" class="icon-share"></lucide-icon>
          }
        }
      </div>

      <div class="notification-content">
        <div class="notification-header">
          <img
            [src]="notification.actor.avatar"
            [alt]="notification.actor.name"
            class="actor-avatar"
          />

          <div class="notification-text">
            <span class="actor-name" [class.verified]="notification.actor.isVerified">
              {{ notification.actor.name }}
              @if (notification.actor.isVerified) {
                <span class="verified-badge" title="Verified">✓</span>
              }
            </span>
            <span class="notification-message">{{ getNotificationMessage() }}</span>
          </div>

          <span class="timestamp" [title]="getFullTimestamp()">{{ getRelativeTime() }}</span>
        </div>

        @if (notification.target) {
          <div class="notification-target">
            <span class="target-type">{{ notification.target.type }}</span>
            <span class="target-preview">{{ notification.target.preview }}</span>
            <lucide-icon [img]="externalLinkIcon" class="target-icon"></lucide-icon>
          </div>
        }
      </div>

      <button
        class="delete-button"
        (click)="deleteNotification($event)"
        title="Delete notification"
        type="button"
      >
        <lucide-icon [img]="deleteIcon" [size]="16"></lucide-icon>
      </button>

      @if (!notification.read) {
        <div class="unread-indicator"></div>
      }
    </div>
  `,
  styles: [`
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--card));
      cursor: pointer;
      transition: all 0.2s;
      position: relative;

      &:hover {
        background: hsl(var(--muted) / 0.5);
      }

      &.unread {
        background: hsl(var(--accent) / 0.05);
      }

      &.unread::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: hsl(var(--accent));
      }
    }

    .notification-icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      lucide-icon {
        width: 18px;
        height: 18px;
      }

      .icon-like { color: #ef4444; }
      .icon-comment { color: #3b82f6; }
      .icon-follow { color: #10b981; }
      .icon-mention { color: #8b5cf6; }
      .icon-reply { color: #f59e0b; }
      .icon-share { color: #ec4899; }
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .actor-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .notification-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .actor-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: hsl(var(--foreground));
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;

      &.verified {
        color: hsl(var(--foreground));
      }
    }

    .verified-badge {
      color: #3b82f6;
      font-size: 0.75rem;
    }

    .notification-message {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .timestamp {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      flex-shrink: 0;
    }

    .notification-target {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: hsl(var(--muted) / 0.3);
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.8125rem;
      margin-top: 0.375rem;

      .target-type {
        text-transform: capitalize;
        font-weight: 500;
        color: hsl(var(--accent));
      }

      .target-preview {
        flex: 1;
        color: hsl(var(--muted-foreground));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .target-icon {
        width: 14px;
        height: 14px;
        color: hsl(var(--muted-foreground));
        flex-shrink: 0;
      }
    }

    .delete-button {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: hsl(var(--muted-foreground));
      border-radius: calc(var(--radius) - 0.25rem);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--destructive) / 0.1);
        color: hsl(var(--destructive));
      }

      .notification-item:hover & {
        opacity: 1;
      }

      lucide-icon {
        width: 16px;
        height: 16px;
      }
    }

    .unread-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: hsl(var(--accent));
      flex-shrink: 0;
      margin-top: 0.75rem;
    }
  `]
})
export class NotificationItemComponent {
  @Input({ required: true }) notification!: Notification;
  @Output() deleted = new EventEmitter<number | string>();
  @Output() clicked = new EventEmitter<Notification>();

  heartIcon = Heart;
  commentIcon = MessageCircle;
  followIcon = UserPlus;
  mentionIcon = AtSign;
  replyIcon = CornerDownRight;
  shareIcon = Share2;
  deleteIcon = X;
  externalLinkIcon = ExternalLink;

  /**
   * Get the notification message based on type
   */
  getNotificationMessage(): string {
    switch (this.notification.type) {
      case NotificationType.LIKE:
        return 'liked your post';
      case NotificationType.COMMENT:
        return 'commented on your post';
      case NotificationType.FOLLOW:
        return 'started following you';
      case NotificationType.MENTION:
        return 'mentioned you';
      case NotificationType.REPLY:
        return 'replied to your comment';
      case NotificationType.SHARE:
        return 'shared your post';
      default:
        return 'interacted with you';
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(): string {
    const date = new Date(this.notification.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Get full timestamp for title attribute
   */
  getFullTimestamp(): string {
    return new Date(this.notification.createdAt).toLocaleString();
  }

  /**
   * Navigate to the target content
   */
  navigateToTarget(): void {
    this.clicked.emit(this.notification);
  }

  /**
   * Delete the notification
   */
  deleteNotification(event: Event): void {
    event.stopPropagation();
    this.deleted.emit(this.notification.id);
  }
}
