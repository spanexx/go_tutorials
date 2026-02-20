# Milestone 4.1 - Real-Time Features (WebSockets)

## Problem Statement
Users expect real-time updates for notifications, messages, and activity feeds. WebSocket integration provides instant communication without polling.

## Success Metrics
- Notifications arrive in real-time
- Messages appear instantly in conversations
- Activity feed updates live
- Online presence indicators work
- Typing indicators show in real-time

## Non-Goals
- Video/audio calling (Phase 5)
- Screen sharing (Phase 5)
- File transfer via WebSockets (Phase 5)

## Items

### Item 4.1.1 - WebSocket Service
**Type:** Feature
**Description:** Create WebSocket connection service with reconnection logic.
**Acceptance Criteria:**
- WebSocketService with connection management
- Automatic reconnection on disconnect
- Connection state tracking
- Authentication token in connection
- Heartbeat/ping-pong for keepalive
- Error handling and fallback to polling
**Passes:** false

### Item 4.1.2 - Real-Time Notifications
**Type:** Feature
**Description:** Implement real-time notification delivery via WebSockets.
**Acceptance Criteria:**
- Subscribe to notification channel on connect
- New notifications appear instantly
- Unread count updates in real-time
- Header badge updates without refresh
- Sound notification (optional toggle)
- Toast notification for new items
**Passes:** false

### Item 4.1.3 - Real-Time Messaging
**Type:** Feature
**Description:** Enable instant message delivery in conversations.
**Acceptance Criteria:**
- Subscribe to conversation channels
- Messages appear instantly on send
- Typing indicators broadcast and display
- Read receipts update in real-time
- Message status (sent, delivered, read)
- Handle offline/online transitions
**Passes:** false

### Item 4.1.4 - Online Presence
**Type:** Feature
**Description:** Show user online/offline status.
**Acceptance Criteria:**
- Track user online status
- Show online indicator on avatars
- "Active now" or "Last seen" text
- Update presence on tab focus/blur
- Handle multiple device connections
- Privacy setting to hide status (placeholder)
**Passes:** false

### Item 4.1.5 - Real-Time Activity Feed
**Type:** Feature
**Description:** Update activity feed in real-time with new interactions.
**Acceptance Criteria:**
- Subscribe to activity channel
- New activities appear at top instantly
- Smooth animation for new items
- Mark as read functionality works
- Load more still functions correctly
**Passes:** false

## Affected Files
- `src/app/shared/services/websocket.service.ts`
- `src/app/shared/services/notification.service.ts`
- `src/app/shared/services/message.service.ts`
- `src/app/shared/components/header/header.component.ts`
- `src/app/pages/messages/messages.component.ts`
- `src/app/pages/notifications/notifications.component.ts`

## Affected Dependencies
- WebSocket API

## Notes
- Use Socket.io or native WebSockets
- Implement graceful degradation
- Handle connection errors gracefully
