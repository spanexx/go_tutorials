/**
 * Notification Model
 * 
 * Defines the structure for notifications in the SocialHub application.
 * Notifications are generated for user activities like likes, comments, follows, etc.
 * 
 * CID: Phase-3 Milestone 3.1 - Notifications System
 */

/**
 * NotificationType enum
 * Represents the different types of notifications
 */
export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MENTION = 'mention',
  REPLY = 'reply',
  SHARE = 'share'
}

/**
 * Notification interface
 * Represents a single notification in the system
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: number | string;
  
  /** Type of notification (like, comment, follow, etc.) */
  type: NotificationType;
  
  /** User who performed the action that triggered the notification */
  actor: {
    id: number | string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  
  /** The target of the notification (post, comment, etc.) */
  target?: {
    id: number | string;
    type: 'post' | 'comment';
    content?: string;
    preview?: string;
  };
  
  /** Whether the notification has been read */
  read: boolean;
  
  /** When the notification was created */
  createdAt: Date | string;
  
  /** Optional message content */
  message?: string;
}

/**
 * NotificationFilter type
 * Used for filtering notifications by type
 */
export type NotificationFilter = 'all' | 'like' | 'comment' | 'follow' | 'mention' | 'reply' | 'share';

/**
 * NotificationsQueryResult interface
 * Represents the result of a notifications query with pagination
 */
export interface NotificationsQueryResult {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}
