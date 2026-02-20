# Milestone 3.1 - Notifications System

## Problem Statement
Users need to be informed about activities relevant to them: likes, comments, follows, mentions. A comprehensive notifications system keeps users engaged and informed.

## Success Metrics
- Users receive notifications for relevant activities
- Notifications have unread indicators
- Notifications are filterable by type
- Users can mark notifications as read/unread
- Unread count badge updates in real-time
- Notification preferences can be managed

## Non-Goals
- Push notifications (Phase 4)
- Email notifications (Phase 4)
- Real-time delivery via WebSockets (Phase 4)

## Items

### Item 3.1.1 - Notification Model & Service
**Type:** Feature
**Description:** Define notification data model and comprehensive service.
**Acceptance Criteria:**
- Notification interface with id, type, actor, target, read, createdAt
- Types: LIKE, COMMENT, FOLLOW, MENTION, REPLY, SHARE
- NotificationService with methods: getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount
- Signal-based notification state
- Unread count tracking
**Passes:** false

### Item 3.1.2 - Notification Item Component
**Type:** Feature
**Description:** Create individual notification display component.
**Acceptance Criteria:**
- Different styling for read vs unread
- Actor avatar and name
- Notification message text
- Target preview (post content snippet)
- Relative timestamp
- Click to navigate to relevant content
- Mark as read on click
- Delete option
**Passes:** false

### Item 3.1.3 - Notifications Page Enhancement
**Type:** Feature
**Description:** Enhance the notifications page with filtering and management.
**Acceptance Criteria:**
- Filter tabs: All, Likes, Comments, Follows, Mentions
- Mark all as read button
- Delete all read notifications button
- Empty state design
- Loading skeleton
- Pull to refresh (mobile)
- Settings link
**Passes:** false

### Item 3.1.4 - Unread Count Badge
**Type:** Feature
**Description:** Add unread notification count to header bell icon.
**Acceptance Criteria:**
- Badge shows count on bell icon in header
- Updates when new notifications arrive
- Clears when notifications viewed
- Maximum display (99+)
- Visual distinction for new notifications
- Click badge to navigate to notifications
**Passes:** false

### Item 3.1.5 - Notification Settings (Placeholder)
**Type:** Feature
**Description:** Create notification settings page structure.
**Acceptance Criteria:**
- Settings page route
- Toggle switches for notification types
- Email notification preferences (placeholder)
- Push notification preferences (placeholder)
- Sound settings (placeholder)
- Save settings functionality
**Passes:** false

## Affected Files
- `src/app/shared/models/notification.model.ts`
- `src/app/shared/services/notification.service.ts`
- `src/app/shared/components/notification-item/notification-item.component.ts`
- `src/app/pages/notifications/notifications.component.ts`
- `src/app/shared/components/header/header.component.ts`
- `src/app/pages/settings/notification-settings/notification-settings.component.ts`

## Affected Dependencies
- None

## Notes
- Prepare for WebSocket real-time updates in Phase 4
- Mock notification generation for testing
