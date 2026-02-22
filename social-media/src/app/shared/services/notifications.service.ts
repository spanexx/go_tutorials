import { Injectable, signal } from '@angular/core';

export type NotificationType = 'like' | 'comment' | 'share' | 'follow' | 'mention' | 'all';

export interface Notification {
  id: number;
  type: NotificationType;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  postId?: number;
  postPreview?: string;
  timestamp: string;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  notificationsSignal = signal<Notification[]>([]);
  selectedFilter = signal<NotificationType>('all');

  get notifications(): Notification[] {
    return this.notificationsSignal();
  }

  get unreadCount(): number {
    return this.notificationsSignal().filter(n => !n.isRead).length;
  }

  get filteredNotifications(): Notification[] {
    const filter = this.selectedFilter();
    const allNotifications = this.notificationsSignal();
    
    if (filter === 'all') {
      return allNotifications;
    }
    return allNotifications.filter(n => n.type === filter);
  }

  setFilter(filter: NotificationType): void {
    this.selectedFilter.set(filter);
  }

  getFilter(): NotificationType {
    return this.selectedFilter();
  }

  markAsRead(notificationId: number): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  }

  markAllAsRead(): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n => ({ ...n, isRead: true }))
    );
  }

  markAsUnread(notificationId: number): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: false } : n
      )
    );
  }

  deleteNotification(notificationId: number): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );
  }

  getNotificationTypeIcon(type: NotificationType): string {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'share': return '↗️';
      case 'follow': return '👤';
      case 'mention': return '@';
      default: return '🔔';
    }
  }

  getNotificationTypeLabel(type: NotificationType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
