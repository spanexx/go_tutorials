import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Notification, NotificationType, NotificationFilter, NotificationsQueryResult } from '../models/notification.model';

/**
 * NotificationService
 * 
 * Manages notifications for the current user.
 * Provides methods to fetch, filter, and manage notification state.
 * 
 * Features:
 * - Signal-based state management for reactive UI updates
 * - Unread count tracking
 * - Filter by notification type
 * - Mark as read/unread functionality
 * - Delete notifications
 * 
 * CID: Phase-3 Milestone 3.1 - Notifications System
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseApiService {
  /** Signal holding all notifications */
  private notificationsSignal = signal<Notification[]>([]);
  
  /** Current filter applied to notifications */
  private currentFilter = signal<NotificationFilter>('all');
  
  /** Loading state */
  private loadingSignal = signal<boolean>(false);
  
  /** Error state */
  private errorSignal = signal<string | null>(null);

  /**
   * Computed signal for filtered notifications
   * Returns notifications based on current filter
   */
  readonly notifications = computed(() => {
    const filter = this.currentFilter();
    const all = this.notificationsSignal();
    
    if (filter === 'all') {
      return all;
    }
    return all.filter(n => n.type === filter);
  });

  /**
   * Computed signal for unread count
   * Returns the number of unread notifications
   */
  readonly unreadCount = computed(() => {
    return this.notificationsSignal().filter(n => !n.read).length;
  });

  /**
   * Computed signal for loading state
   */
  readonly isLoading = computed(() => this.loadingSignal());

  /**
   * Computed signal for error state
   */
  readonly error = computed(() => this.errorSignal());

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Get notifications from the API
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsQueryResult> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.get<NotificationsQueryResult>('/notifications', { 
        page: page.toString(), 
        limit: limit.toString() 
      }).toPromise();

      if (response) {
        this.notificationsSignal.set(response.notifications);
        return response;
      }
    } catch (error) {
      this.errorSignal.set('Failed to load notifications');
      this.notificationsSignal.set([]);
      this.loadingSignal.set(false);

      return {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
        page,
        limit
      };
    }

    this.notificationsSignal.set([]);
    this.loadingSignal.set(false);
    return {
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      hasMore: false,
      page,
      limit
    };
  }

  /**
   * Mark a notification as read
   * @param notificationId - ID of notification to mark as read
   */
  async markAsRead(notificationId: number | string): Promise<void> {
    try {
      await this.post(`/notifications/${notificationId}/read`, {}).toPromise();
    } catch (error) {
      console.warn('API call failed, updating local state only');
    }

    // Optimistic update
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await this.post('/notifications/read-all', {}).toPromise();
    } catch (error) {
      console.warn('API call failed, updating local state only');
    }

    // Optimistic update
    this.notificationsSignal.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  /**
   * Mark a notification as unread
   * @param notificationId - ID of notification to mark as unread
   */
  async markAsUnread(notificationId: number | string): Promise<void> {
    try {
      await this.post(`/notifications/${notificationId}/unread`, {}).toPromise();
    } catch (error) {
      console.warn('API call failed, updating local state only');
    }

    // Optimistic update
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: false } : n
      )
    );
  }

  /**
   * Delete a notification
   * @param notificationId - ID of notification to delete
   */
  async deleteNotification(notificationId: number | string): Promise<void> {
    try {
      await this.delete(`/notifications/${notificationId}`).toPromise();
    } catch (error) {
      console.warn('API call failed, updating local state only');
    }

    // Optimistic update
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<void> {
    try {
      await this.delete('/notifications/read').toPromise();
    } catch (error) {
      console.warn('API call failed, updating local state only');
    }

    // Optimistic update
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => !n.read)
    );
  }

  /**
   * Set the current filter
   * @param filter - Filter to apply
   */
  setFilter(filter: NotificationFilter): void {
    this.currentFilter.set(filter);
  }

  /**
   * Get the current filter
   */
  getFilter(): NotificationFilter {
    return this.currentFilter();
  }

  /**
   * Get notification type label for display
   */
  getNotificationTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      [NotificationType.LIKE]: 'Like',
      [NotificationType.COMMENT]: 'Comment',
      [NotificationType.FOLLOW]: 'Follow',
      [NotificationType.MENTION]: 'Mention',
      [NotificationType.REPLY]: 'Reply',
      [NotificationType.SHARE]: 'Share'
    };
    return labels[type] || type;
  }

  /**
   * Get notification type icon name
   */
  getNotificationTypeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      [NotificationType.LIKE]: 'heart',
      [NotificationType.COMMENT]: 'message-circle',
      [NotificationType.FOLLOW]: 'user-plus',
      [NotificationType.MENTION]: 'at-sign',
      [NotificationType.REPLY]: 'corner-down-right',
      [NotificationType.SHARE]: 'share'
    };
    return icons[type] || 'bell';
  }

  /**
   * Clear all notifications from local state
   */
  clear(): void {
    this.notificationsSignal.set([]);
  }

  /**
   * Refresh notifications from API
   */
  async refresh(): Promise<void> {
    await this.getNotifications();
  }
}
