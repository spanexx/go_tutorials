// Code Map: activity.service.ts
// - ActivityService: Service for tracking user interactions and activity feed
// - Activity interface with id, type, actor, target, timestamp
// - Activity types: LIKE, COMMENT, FOLLOW, POST, SHARE, MENTION
// - Methods: getUserActivity, getFeedActivity, createActivity
// - Signal-based activity feed with pagination support
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseApiService } from './base-api.service';

export enum ActivityType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  FOLLOW = 'FOLLOW',
  POST = 'POST',
  SHARE = 'SHARE',
  MENTION = 'MENTION',
  REACTION = 'REACTION',
  REPLY = 'REPLY'
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface ActivityTarget {
  id: string;
  type: 'post' | 'comment' | 'user';
  content?: string;
  title?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  actor: User;
  target: ActivityTarget;
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface ActivityFeed {
  activities: Activity[];
  hasMore: boolean;
  cursor: string | null;
}

export interface ActivityState {
  feed: Activity[];
  userActivity: Record<string, Activity[]>;
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService extends BaseApiService {
  private activityState = signal<ActivityState>({
    feed: [],
    userActivity: {},
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    cursor: null
  });

  // Get all activities in feed
  activities = computed(() => this.activityState().feed);

  // Get unread count
  unreadCount = computed(() => this.activityState().unreadCount);

  // Check if loading
  isLoading = computed(() => this.activityState().isLoading);

  // Check if more activities available
  hasMore = computed(() => this.activityState().hasMore);

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Get activity feed with pagination
   */
  async getFeedActivity(limit: number = 20, cursor?: string, type?: ActivityType): Promise<ActivityFeed> {
    this.activityState.update(state => ({ ...state, isLoading: true }));
    try {
      const resp = await firstValueFrom(this.get<{ activities: any[]; has_more: boolean; cursor: string }>('/activity', {
        limit: String(limit),
        cursor,
        type
      }));

      const activities = (resp.activities ?? []).map(a => this.mapApiActivity(a));

      this.activityState.update(state => ({
        ...state,
        feed: cursor ? [...state.feed, ...activities] : activities,
        unreadCount: (cursor ? [...state.feed, ...activities] : activities).filter(x => !x.read).length,
        isLoading: false,
        hasMore: resp.has_more,
        cursor: resp.cursor || null
      }));

      return {
        activities,
        hasMore: resp.has_more,
        cursor: resp.cursor || null
      };
    } finally {
      this.activityState.update(state => ({ ...state, isLoading: false }));
    }
  }

  /**
   * Get user's activity history
   */
  getUserActivity(userId: string, limit: number = 20): Promise<Activity[]> {
    return new Promise((resolve) => {
      const state = this.activityState();
      
      // Check cache first
      if (state.userActivity[userId]) {
        resolve(state.userActivity[userId].slice(0, limit));
        return;
      }

      // Filter activities where user is the actor
      const userActivities = state.feed.filter(a => a.actor.id === userId);
      
      // Cache the result
      this.activityState.update(state => ({
        ...state,
        userActivity: {
          ...state.userActivity,
          [userId]: userActivities
        }
      }));

      resolve(userActivities.slice(0, limit));
    });
  }

  /**
   * Create a new activity
   */
  createActivity(type: ActivityType, actor: User, target: ActivityTarget, metadata?: Record<string, any>): Activity {
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      type,
      actor,
      target,
      timestamp: new Date(),
      read: false,
      metadata
    };

    this.activityState.update(state => ({
      ...state,
      feed: [newActivity, ...state.feed],
      unreadCount: state.unreadCount + 1
    }));

    return newActivity;
  }

  /**
   * Mark activity as read
   */
  markAsRead(activityId: string): void {
    void firstValueFrom(this.post(`/activity/${activityId}/read`, {})).catch(() => {});
    this.activityState.update(state => {
      const updated = state.feed.map(a => (a.id === activityId ? { ...a, read: true } : a));
      return {
        ...state,
        feed: updated,
        unreadCount: updated.filter(a => !a.read).length
      };
    });
  }

  /**
   * Mark all activities as read
   */
  markAllAsRead(): void {
    void firstValueFrom(this.post(`/activity/read-all`, {})).catch(() => {});
    this.activityState.update(state => ({
      ...state,
      feed: state.feed.map(a => ({ ...a, read: true })),
      unreadCount: 0
    }));
  }

  /**
   * Get unread activities
   */
  getUnreadActivities(): Activity[] {
    const state = this.activityState();
    return state.feed.filter(a => !a.read);
  }

  /**
   * Get activities by type
   */
  getActivitiesByType(type: ActivityType): Activity[] {
    const state = this.activityState();
    return state.feed.filter(a => a.type === type);
  }

  /**
   * Clear activity feed (for testing)
   */
  clear(): void {
    this.activityState.set({
      feed: [],
      userActivity: {},
      unreadCount: 0,
      isLoading: false,
      hasMore: true,
      cursor: null
    });
  }

  /**
   * Refresh activity feed
   */
  async refresh(): Promise<void> {
    this.activityState.update(state => ({ ...state, cursor: null }));
    await this.getFeedActivity(20);
  }

  private mapApiActivity(a: any): Activity {
    return {
      id: String(a.id),
      type: a.type as ActivityType,
      actor: {
        id: String(a.actor?.id ?? ''),
        name: String(a.actor?.name ?? ''),
        username: String(a.actor?.username ?? ''),
        avatar: a.actor?.avatar ?? undefined
      },
      target: {
        id: String(a.target?.id ?? ''),
        type: (a.target?.type ?? 'post') as any,
        content: a.target?.content,
        title: a.target?.title
      },
      timestamp: new Date(a.timestamp),
      read: Boolean(a.read),
      metadata: a.metadata ?? undefined
    };
  }

  /**
   * Get activity type label
   */
  static getActivityLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      [ActivityType.LIKE]: 'liked',
      [ActivityType.COMMENT]: 'commented on',
      [ActivityType.FOLLOW]: 'started following',
      [ActivityType.POST]: 'posted',
      [ActivityType.SHARE]: 'shared',
      [ActivityType.MENTION]: 'mentioned you in',
      [ActivityType.REACTION]: 'reacted to',
      [ActivityType.REPLY]: 'replied to'
    };
    return labels[type];
  }

  /**
   * Get activity type icon
   */
  static getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      [ActivityType.LIKE]: 'heart',
      [ActivityType.COMMENT]: 'message-circle',
      [ActivityType.FOLLOW]: 'user-plus',
      [ActivityType.POST]: 'file-text',
      [ActivityType.SHARE]: 'share-2',
      [ActivityType.MENTION]: 'at-sign',
      [ActivityType.REACTION]: 'smile',
      [ActivityType.REPLY]: 'corner-down-right'
    };
    return icons[type];
  }
}
