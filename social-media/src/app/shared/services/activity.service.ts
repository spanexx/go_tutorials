import { Injectable, signal } from '@angular/core';

export type ActivityType = 'like' | 'comment' | 'follow' | 'share' | 'post' | 'mention';

export interface Activity {
  id: string;
  type: ActivityType;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  target?: {
    type: 'post' | 'user';
    content?: string;
    username?: string;
  };
  timestamp: Date;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private activitiesSignal = signal<Activity[]>([]);
  activities = this.activitiesSignal.asReadonly();

  constructor() {
    this.initializeMockActivities();
  }

  private initializeMockActivities(): void {
    const now = new Date();
    
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'like',
        user: { name: 'Sarah Johnson', username: 'sarahjohnson', avatar: 'https://i.pravatar.cc/150?img=5' },
        target: { type: 'post', content: 'Just launched my new portfolio website!' },
        timestamp: new Date(now.getTime() - 5 * 60000), // 5 minutes ago
        isRead: false
      },
      {
        id: '2',
        type: 'follow',
        user: { name: 'Alex Chen', username: 'alexchen', avatar: 'https://i.pravatar.cc/150?img=3' },
        target: { type: 'user', username: 'ninapatel' },
        timestamp: new Date(now.getTime() - 15 * 60000), // 15 minutes ago
        isRead: false
      },
      {
        id: '3',
        type: 'comment',
        user: { name: 'Emma Davis', username: 'emmadavis', avatar: 'https://i.pravatar.cc/150?img=7' },
        target: { type: 'post', content: 'Hot take: TypeScript makes you a better developer...' },
        timestamp: new Date(now.getTime() - 30 * 60000), // 30 minutes ago
        isRead: false
      },
      {
        id: '4',
        type: 'share',
        user: { name: 'Marcus Williams', username: 'marcuswilliams', avatar: 'https://i.pravatar.cc/150?img=12' },
        target: { type: 'post', content: '30-day coding challenge results' },
        timestamp: new Date(now.getTime() - 60 * 60000), // 1 hour ago
        isRead: true
      },
      {
        id: '5',
        type: 'mention',
        user: { name: 'Lisa Rodriguez', username: 'lisarodriguez', avatar: 'https://i.pravatar.cc/150?img=11' },
        target: { type: 'post', content: 'Great insights from @currentuser on web development' },
        timestamp: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
        isRead: true
      },
      {
        id: '6',
        type: 'post',
        user: { name: 'Nina Patel', username: 'ninapatel', avatar: 'https://i.pravatar.cc/150?img=9' },
        target: { type: 'post', content: 'Just finished reading an amazing book on Angular!' },
        timestamp: new Date(now.getTime() - 3 * 60 * 60000), // 3 hours ago
        isRead: true
      },
      {
        id: '7',
        type: 'like',
        user: { name: 'Jake Thompson', username: 'jakethompson', avatar: 'https://i.pravatar.cc/150?img=8' },
        target: { type: 'post', content: 'The future of web development' },
        timestamp: new Date(now.getTime() - 5 * 60 * 60000), // 5 hours ago
        isRead: true
      },
      {
        id: '8',
        type: 'follow',
        user: { name: 'Michael Chen', username: 'michaelchen', avatar: 'https://i.pravatar.cc/150?img=10' },
        target: { type: 'user', username: 'alexchen' },
        timestamp: new Date(now.getTime() - 24 * 60 * 60000), // 1 day ago
        isRead: true
      }
    ];

    this.activitiesSignal.set(mockActivities);
  }

  getActivities(limit?: number): Activity[] {
    const all = this.activitiesSignal();
    if (limit) {
      return all.slice(0, limit);
    }
    return all;
  }

  getUnreadCount(): number {
    return this.activitiesSignal().filter(a => !a.isRead).length;
  }

  markAsRead(activityId: string): void {
    this.activitiesSignal.update(activities =>
      activities.map(a =>
        a.id === activityId ? { ...a, isRead: true } : a
      )
    );
  }

  markAllAsRead(): void {
    this.activitiesSignal.update(activities =>
      activities.map(a => ({ ...a, isRead: true }))
    );
  }

  getRecentActivities(hours: number = 24): Activity[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.activitiesSignal().filter(a => a.timestamp > cutoff);
  }

  getActivitiesByType(type: ActivityType): Activity[] {
    return this.activitiesSignal().filter(a => a.type === type);
  }

  getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      like: '❤️',
      comment: '💬',
      follow: '👤',
      share: '↗️',
      post: '📝',
      mention: '@'
    };
    return icons[type];
  }

  getActivityColor(type: ActivityType): string {
    const colors: Record<ActivityType, string> = {
      like: 'hsl(var(--destructive))',
      comment: 'hsl(var(--accent))',
      follow: 'hsl(var(--success))',
      share: 'hsl(var(--info))',
      post: 'hsl(var(--warning))',
      mention: 'hsl(var(--accent))'
    };
    return colors[type];
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
