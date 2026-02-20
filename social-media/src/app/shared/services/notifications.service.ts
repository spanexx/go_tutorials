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
  private notificationsData: Notification[] = [
    {
      id: 1,
      type: 'like',
      user: { name: 'Sarah Johnson', username: 'sarahjohnson', avatar: 'https://i.pravatar.cc/150?img=5' },
      content: 'liked your post',
      postId: 1,
      postPreview: 'Just launched my new portfolio website! Check it out...',
      timestamp: '2 hours ago',
      isRead: false
    },
    {
      id: 2,
      type: 'follow',
      user: { name: 'Alex Chen', username: 'alexchen', avatar: 'https://i.pravatar.cc/150?img=3' },
      content: 'started following you',
      timestamp: '4 hours ago',
      isRead: false
    },
    {
      id: 3,
      type: 'comment',
      user: { name: 'Emma Davis', username: 'emmadavis', avatar: 'https://i.pravatar.cc/150?img=7' },
      content: 'commented on your post',
      postId: 2,
      postPreview: 'Hot take: TypeScript makes you a better developer...',
      timestamp: '6 hours ago',
      isRead: false
    },
    {
      id: 4,
      type: 'mention',
      user: { name: 'Michael Chen', username: 'michaelchen', avatar: 'https://i.pravatar.cc/150?img=10' },
      content: 'mentioned you in a post',
      postId: 3,
      postPreview: 'Great insights from @currentuser on web development!',
      timestamp: '1 day ago',
      isRead: true
    },
    {
      id: 5,
      type: 'share',
      user: { name: 'Lisa Rodriguez', username: 'lisarodriguez', avatar: 'https://i.pravatar.cc/150?img=11' },
      content: 'shared your post',
      postId: 1,
      postPreview: 'Just launched my new portfolio website! Check it out...',
      timestamp: '2 days ago',
      isRead: true
    },
    {
      id: 6,
      type: 'like',
      user: { name: 'Marcus Williams', username: 'marcuswilliams', avatar: 'https://i.pravatar.cc/150?img=12' },
      content: 'liked your post',
      postId: 2,
      postPreview: 'Hot take: TypeScript makes you a better developer...',
      timestamp: '3 days ago',
      isRead: true
    },
    {
      id: 7,
      type: 'follow',
      user: { name: 'Nina Patel', username: 'ninapatel', avatar: 'https://i.pravatar.cc/150?img=9' },
      content: 'started following you',
      timestamp: '4 days ago',
      isRead: true
    },
    {
      id: 8,
      type: 'comment',
      user: { name: 'Jake Thompson', username: 'jakethompson', avatar: 'https://i.pravatar.cc/150?img=8' },
      content: 'commented on your post',
      postId: 3,
      postPreview: 'Just finished a 30-day coding challenge!',
      timestamp: '5 days ago',
      isRead: true
    }
  ];

  notificationsSignal = signal<Notification[]>([...this.notificationsData]);
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
