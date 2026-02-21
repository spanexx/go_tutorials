// Code Map: activity.service.ts
// - ActivityService: Service for tracking user interactions and activity feed
// - Activity interface with id, type, actor, target, timestamp
// - Activity types: LIKE, COMMENT, FOLLOW, POST, SHARE, MENTION
// - Methods: getUserActivity, getFeedActivity, createActivity
// - Signal-based activity feed with pagination support
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Injectable, signal, computed } from '@angular/core';

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
export class ActivityService {
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

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockUsers: User[] = [
      { id: 'user-1', name: 'Alice Johnson', username: 'alice', avatar: '/avatars/alice.jpg' },
      { id: 'user-2', name: 'Bob Smith', username: 'bob', avatar: '/avatars/bob.jpg' },
      { id: 'user-3', name: 'Carol White', username: 'carol', avatar: '/avatars/carol.jpg' },
      { id: 'user-4', name: 'David Brown', username: 'david', avatar: '/avatars/david.jpg' },
      { id: 'user-5', name: 'Eve Davis', username: 'eve', avatar: '/avatars/eve.jpg' }
    ];

    const mockActivities: Activity[] = [
      {
        id: 'activity-1',
        type: ActivityType.LIKE,
        actor: mockUsers[0],
        target: { id: 'post-1', type: 'post', content: 'Just shipped a new feature!' },
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        read: false
      },
      {
        id: 'activity-2',
        type: ActivityType.COMMENT,
        actor: mockUsers[1],
        target: { id: 'post-2', type: 'post', content: 'Working on Angular updates' },
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        metadata: { comment: 'Great progress!' }
      },
      {
        id: 'activity-3',
        type: ActivityType.FOLLOW,
        actor: mockUsers[2],
        target: { id: 'user-current', type: 'user' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true
      },
      {
        id: 'activity-4',
        type: ActivityType.REACTION,
        actor: mockUsers[3],
        target: { id: 'post-3', type: 'post', content: 'Check out my latest project' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: true,
        metadata: { reactionType: 'Love' }
      },
      {
        id: 'activity-5',
        type: ActivityType.SHARE,
        actor: mockUsers[4],
        target: { id: 'post-4', type: 'post', content: 'TypeScript tips and tricks' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true
      },
      {
        id: 'activity-6',
        type: ActivityType.MENTION,
        actor: mockUsers[0],
        target: { id: 'post-5', type: 'post', content: 'Thanks @currentuser for the help!' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true
      },
      {
        id: 'activity-7',
        type: ActivityType.REPLY,
        actor: mockUsers[1],
        target: { id: 'comment-1', type: 'comment', content: 'This is really helpful' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        read: true
      },
      {
        id: 'activity-8',
        type: ActivityType.POST,
        actor: mockUsers[2],
        target: { id: 'post-6', type: 'post', title: 'New blog post published' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        read: true
      }
    ];

    const unreadCount = mockActivities.filter(a => !a.read).length;

    this.activityState.set({
      feed: mockActivities,
      userActivity: {},
      unreadCount,
      isLoading: false,
      hasMore: true,
      cursor: 'cursor-8'
    });
  }

  /**
   * Get activity feed with pagination
   */
  getFeedActivity(limit: number = 20, cursor?: string): Promise<ActivityFeed> {
    return new Promise((resolve) => {
      this.activityState.update(state => ({ ...state, isLoading: true }));

      // Simulate API delay
      setTimeout(() => {
        const state = this.activityState();
        const activities = state.feed;
        
        // Apply pagination
        const startIndex = cursor ? activities.findIndex(a => a.id === cursor) + 1 : 0;
        const paginatedActivities = activities.slice(startIndex, startIndex + limit);
        
        this.activityState.update(state => ({
          ...state,
          isLoading: false,
          cursor: startIndex + limit < activities.length 
            ? activities[startIndex + limit].id 
            : null,
          hasMore: startIndex + limit < activities.length
        }));

        resolve({
          activities: paginatedActivities,
          hasMore: startIndex + limit < activities.length,
          cursor: startIndex + limit < activities.length 
            ? activities[startIndex + limit].id 
            : null
        });
      }, 300);
    });
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
    this.activityState.update(state => ({
      ...state,
      feed: state.feed.map(a => 
        a.id === activityId ? { ...a, read: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  }

  /**
   * Mark all activities as read
   */
  markAllAsRead(): void {
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
    this.activityState.update(state => ({ ...state, isLoading: true }));
    
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.activityState.update(state => ({ ...state, isLoading: false }));
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
