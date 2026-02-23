/**
 * NotificationRealtimeService
 *
 * Integrates real-time notifications into the Angular app using WebSocket.
 *
 * Features:
 * - Subscribe to notification channel on login
 * - Toast notification on new notification
 * - Update notification badge count in header
 * - Mark as read syncs with server
 * - Desktop notifications (Notification API)
 *
 * CID: Phase-3 Milestone 3.7 - Realtime Service
 */
import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService, WSMessage, ConnectionStatus } from './websocket.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Notification } from '../models/notification.model';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

/**
 * Real-time notification payload structure
 */
export interface RealtimeNotification {
  id: string;
  type: string;
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  post_id?: string;
  comment_id?: string;
  message: string;
  created_at: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationRealtimeService implements OnDestroy {
  /** Destroy subject for cleanup */
  private destroySubject = new Subject<void>();

  /** Whether desktop notifications are enabled */
  private desktopNotificationsEnabled = false;

  /** Notification permission status */
  private permissionStatus: NotificationPermission = 'default';

  /** Last notification ID to prevent duplicates */
  private lastNotificationId: string | null = null;

  constructor(
    private wsService: WebSocketService,
    private notificationService: NotificationService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.checkDesktopNotificationSupport();
    this.setupWebSocketListeners();
  }

  /**
   * Initialize real-time notifications
   * Should be called after user login
   */
  initialize(): void {
    const user = this.authService.user;
    const token = this.authService.getToken();

    if (!user || !token) {
      return;
    }

    // Connect to WebSocket if not already connected
    if (this.wsService.status === ConnectionStatus.DISCONNECTED) {
      this.wsService.connect(token, user.id);
    }

    // Subscribe to notification channel
    this.subscribeToNotifications();

    // Request desktop notification permission if enabled
    if (this.desktopNotificationsEnabled) {
      this.requestDesktopPermission();
    }
  }

  /**
   * Clean up on destroy
   */
  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
  }

  /**
   * Enable desktop notifications
   */
  enableDesktopNotifications(): void {
    this.desktopNotificationsEnabled = true;
    this.requestDesktopPermission();
  }

  /**
   * Disable desktop notifications
   */
  disableDesktopNotifications(): void {
    this.desktopNotificationsEnabled = false;
  }

  /**
   * Check if desktop notifications are supported
   */
  private checkDesktopNotificationSupport(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionStatus = Notification.permission;
      this.desktopNotificationsEnabled = this.permissionStatus === 'granted';
    }
  }

  /**
   * Request permission for desktop notifications
   */
  private requestDesktopPermission(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        this.permissionStatus = permission;
        this.desktopNotificationsEnabled = permission === 'granted';
      });
    }
  }

  /**
   * Setup WebSocket connection listeners
   */
  private setupWebSocketListeners(): void {
    // Listen for connection status changes
    this.wsService.status$
      .pipe(
        filter(status => status === ConnectionStatus.CONNECTED),
        takeUntil(this.destroySubject)
      )
      .subscribe(() => {
        this.subscribeToNotifications();
      });
  }

  /**
   * Subscribe to notification channel
   */
  private subscribeToNotifications(): void {
    this.wsService.subscribe('notifications')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<RealtimeNotification>) => {
          this.handleNotification(message.payload);
        },
        error: (error) => {
          console.error('Error receiving real-time notification:', error);
        }
      });
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: RealtimeNotification): void {
    // Prevent duplicate notifications
    if (notification.id === this.lastNotificationId) {
      return;
    }
    this.lastNotificationId = notification.id;

    // Update notification service state
    this.addNotificationToState(notification);

    // Show toast notification
    this.showToastNotification(notification);

    // Show desktop notification if enabled
    if (this.desktopNotificationsEnabled) {
      this.showDesktopNotification(notification);
    }
  }

  /**
   * Add notification to service state
   */
  private addNotificationToState(notification: RealtimeNotification): void {
    // Convert realtime notification to app notification model
    const appNotification: Notification = {
      id: notification.id,
      type: this.mapNotificationType(notification.type),
      message: notification.message,
      actor: {
        id: notification.actor_id,
        name: notification.actor_name,
        avatar: notification.actor_avatar || ''
      },
      post: notification.post_id ? { id: notification.post_id } : undefined,
      comment: notification.comment_id ? { id: notification.comment_id } : undefined,
      read: notification.read,
      createdAt: new Date(notification.created_at)
    };

    // Add notification to service state
    this.notificationService.addNotification(appNotification);
  }

  /**
   * Show toast notification
   */
  private showToastNotification(notification: RealtimeNotification): void {
    const type = this.getToastType(notification.type);
    const title = this.getToastTitle(notification.type);

    this.toastService.show(title, {
      type,
      message: notification.message,
      duration: 5000
    });
  }

  /**
   * Show desktop notification
   */
  private showDesktopNotification(notification: RealtimeNotification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const icon = notification.actor_avatar || '/assets/icons/notification-icon.png';
    const badge = '/assets/icons/badge-icon.png';

    new Notification(this.getToastTitle(notification.type), {
      body: notification.message,
      icon,
      badge,
      tag: notification.id, // Prevent duplicate notifications
      requireInteraction: false,
      silent: true
    });
  }

  /**
   * Map realtime notification type to app notification type
   */
  private mapNotificationType(type: string): string {
    const typeMap: Record<string, string> = {
      'like': 'like',
      'comment': 'comment',
      'follow': 'follow',
      'mention': 'mention',
      'reply': 'reply',
      'share': 'share'
    };
    return typeMap[type] || type;
  }

  /**
   * Get toast type based on notification type
   */
  private getToastType(notificationType: string): 'success' | 'error' | 'warning' | 'info' {
    switch (notificationType) {
      case 'like':
      case 'follow':
        return 'success';
      case 'comment':
      case 'reply':
      case 'mention':
        return 'info';
      case 'share':
        return 'success';
      default:
        return 'info';
    }
  }

  /**
   * Get toast title based on notification type
   */
  private getToastTitle(notificationType: string): string {
    switch (notificationType) {
      case 'like':
        return 'New Like';
      case 'comment':
        return 'New Comment';
      case 'follow':
        return 'New Follower';
      case 'mention':
        return 'You were mentioned';
      case 'reply':
        return 'New Reply';
      case 'share':
        return 'Your post was shared';
      default:
        return 'New Notification';
    }
  }

  /**
   * Mark notification as read and sync with server
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.notificationService.markAsRead(notificationId);
      
      // Send read receipt via WebSocket
      this.wsService.send({
        type: 'notification_read',
        channel: 'notifications',
        payload: {
          notification_id: notificationId,
          read_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read and sync with server
   */
  async markAllAsRead(): Promise<void> {
    try {
      await this.notificationService.markAllAsRead();
      
      // Send read receipt via WebSocket
      this.wsService.send({
        type: 'notification_read_all',
        channel: 'notifications',
        payload: {
          read_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Get current unread count from notification service
   */
  getUnreadCount(): number {
    return this.notificationService.unreadCount();
  }

  /**
   * Listen to unread count changes
   */
  onUnreadCountChange(): () => number {
    return () => this.notificationService.unreadCount();
  }
}
