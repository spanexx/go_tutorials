# Milestone 3.7 - Realtime Service

## Problem Statement
The application lacks real-time capabilities such as live notifications, instant messaging, typing indicators, and live feed updates. Users must manually refresh to see new content, creating a disconnected experience. A dedicated Realtime Service using WebSockets is needed to enable instant, bidirectional communication between server and clients.

## Success Metrics
- Realtime service running on port 8082
- WebSocket connections stable with automatic reconnection
- Notifications delivered in <100ms (p95)
- Support for 1000+ concurrent connections (single instance)
- Message delivery guarantee (at-least-once)
- Angular frontend shows real-time updates without refresh
- Fallback to HTTP polling when WebSocket unavailable

## Non-Goals
- Video/audio calls (WebRTC) - Future phase
- File transfer over WebSocket - Future phase
- End-to-end encryption for messages - Phase 4
- Message reactions in chat - Phase 4
- Voice messages - Future phase

## Items

### Item 3.7.1 - WebSocket Server Setup
**Type:** Infrastructure
**Description:** Set up WebSocket server with Gorilla WebSocket library.
**Acceptance Criteria:**
- `cmd/realtime-service/main.go` with WebSocket server
- `internal/websocket/server.go` with WebSocketServer struct
- Upgrade HTTP connections to WebSocket
- Handle WebSocket handshake properly
- Subprotocol negotiation (json-rpc or custom)
- Compression enabled (permessage-deflate)
- Ping/pong for connection health checks (30s interval)
- Graceful shutdown drains connections
**Passes:** false

### Item 3.7.2 - Connection Manager
**Type:** Feature
**Description:** Implement connection lifecycle management.
**Acceptance Criteria:**
- `internal/websocket/connection.go` with Connection struct
- `internal/websocket/manager.go` with ConnectionManager
- Methods:
  - AddConnection(userID, conn)
  - RemoveConnection(userID)
  - GetConnection(userID)
  - BroadcastToUser(userID, message)
  - BroadcastToChannel(channel, message)
  - GetConnectionsByChannel(channel)
- Thread-safe with mutex or sync.Map
- Connection metadata: userID, channels, lastSeen, userAgent
- Max connections per user (prevent abuse)
**Passes:** false

### Item 3.7.3 - Message Protocol Design
**Type:** Feature
**Description:** Define WebSocket message format and types.
**Acceptance Criteria:**
- `internal/websocket/protocol.go` with message types
- Message format:
  ```json
  {
    "type": "notification|message|presence|typing",
    "event": "new_notification|read_receipt|...",
    "data": { ... },
    "timestamp": 1234567890
  }
  ```
- Acknowledgment system (message ID + ack)
- Error messages: `{ "type": "error", "code": "...", "message": "..." }`
- Heartbeat messages for keepalive
- Version field for protocol evolution
**Passes:** false

### Item 3.7.4 - Notification Channel
**Type:** Feature
**Description:** Implement real-time notification delivery.
**Acceptance Criteria:**
- Users subscribed to personal notification channel
- Notification payload:
  ```json
  {
    "id": "uuid",
    "type": "like|comment|follow|mention",
    "actor": { "id": "...", "username": "..." },
    "post_id": "uuid",
    "read": false,
    "created_at": "..."
  }
  ```
- Push notification when:
  - Someone likes your post
  - Someone comments on your post
  - Someone follows you
  - Someone mentions you
- Badge count update (unread count)
- Batch notifications for high-volume users
**Passes:** false

### Item 3.7.5 - Messaging Channel
**Type:** Feature
**Description:** Implement real-time direct messaging.
**Acceptance Criteria:**
- Private channels for 1:1 conversations
- Message format:
  ```json
  {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "content": "text",
    "timestamp": 1234567890,
    "read": false
  }
  ```
- Message persistence in PostgreSQL (prepare schema)
- Message ordering guaranteed
- Delivery confirmation
- Online/offline message handling
- Message history via HTTP API
**Passes:** false

### Item 3.7.6 - Typing Indicators
**Type:** Feature
**Description:** Implement real-time typing status.
**Acceptance Criteria:**
- Typing event: `{ "event": "typing_start", "conversation_id": "..." }`
- Stop typing event: `{ "event": "typing_stop", "conversation_id": "..." }`
- Debounce typing events (max 1 per 2 seconds)
- Auto-clear after 5 seconds of inactivity
- Show "User is typing..." in UI
- Respects user privacy settings (can disable)
**Passes:** false

### Item 3.7.7 - Presence System
**Type:** Feature
**Description:** Implement online/offline status tracking.
**Acceptance Criteria:**
- Presence channel for status updates
- Status values: online, offline, away, busy
- Automatic online on WebSocket connect
- Automatic offline on disconnect (with debounce)
- Manual status change API
- Presence broadcast to followers
- Last seen timestamp for offline users
- Redis-based presence for multi-instance (prepare)
**Passes:** false

### Item 3.7.8 - Read Receipts
**Type:** Feature
**Description:** Implement message read confirmation.
**Acceptance Criteria:**
- Read receipt event: `{ "event": "message_read", "message_ids": [...] }`
- Batch read receipts for efficiency
- Update message status in database
- Show read status in UI (checkmarks)
- Per-message read tracking
- Read receipts only sent to message sender
- Privacy setting to disable read receipts
**Passes:** false

### Item 3.7.9 - Reconnection & Recovery
**Type:** Feature
**Description:** Handle WebSocket disconnections and message recovery.
**Acceptance Criteria:**
- Client-side auto-reconnect with exponential backoff
- Reconnection token for session recovery
- Message queue for offline users (Redis streams)
- Catch-up on reconnect:
  - Missed notifications
  - Missed messages
  - Presence updates
- Sequence numbers for gap detection
- Last message ID tracking
- Max queue size (100 messages per user)
**Passes:** false

### Item 3.7.10 - Fallback to HTTP Polling
**Type:** Feature
**Description:** Provide HTTP polling for clients without WebSocket support.
**Acceptance Criteria:**
- `GET /api/v1/realtime/poll` endpoint
- Long polling (30s timeout)
- Returns events since last_poll_id
- Event store in Redis for polling
- Polling interval: 5 seconds (client-side)
- Seamless upgrade to WebSocket if available
- Same event format as WebSocket
**Passes:** false

### Item 3.7.11 - Angular WebSocket Service
**Type:** Integration
**Description:** Create Angular service for WebSocket communication.
**Acceptance Criteria:**
- `src/app/shared/services/websocket.service.ts`
- Methods:
  - connect()
  - disconnect()
  - subscribe(channel)
  - unsubscribe(channel)
  - send(message)
  - on(event) - Observable
- Automatic reconnection with backoff
- Connection status observable
- Message queue while disconnected
- RxJS-based event streams
- Interceptors for auth token
- Fallback to HTTP polling
**Passes:** false

### Item 3.7.12 - Real-Time Notifications Integration
**Type:** Integration
**Description:** Integrate real-time notifications into Angular app.
**Acceptance Criteria:**
- `src/app/shared/services/notification-realtime.service.ts`
- Subscribe to notification channel on login
- Toast notification on new notification
- Update notification badge count in header
- Mark as read syncs with server
- Notification sound (optional, user setting)
- Desktop notifications (Notification API)
- Notification action handlers
**Passes:** false

### Item 3.7.13 - Real-Time Messages Integration
**Type:** Integration
**Description:** Integrate real-time messaging into Angular app.
**Acceptance Criteria:**
- `src/app/pages/messages/messages-realtime.service.ts`
- Live message updates in conversation view
- Typing indicator display
- Online status in user avatars
- New message notifications
- Unread count in conversation list
- Auto-scroll to new messages
- Message delivery status (sent, delivered, read)
**Passes:** false

### Item 3.7.14 - Real-Time Feed Updates
**Type:** Integration
**Description:** Enable live updates to feed without refresh.
**Acceptance Criteria:**
- Subscribe to feed updates channel
- New post notification (toast or banner)
- "X new posts" banner (click to load)
- Live reaction/comment counts
- Avoid disruptive auto-scroll
- Throttle updates (batch every 30 seconds)
- User preference for auto-refresh
**Passes:** false

### Item 3.7.15 - Integration Tests
**Type:** Test
**Description:** Write comprehensive tests for realtime service.
**Acceptance Criteria:**
- `internal/websocket/server_test.go`
- `internal/websocket/manager_test.go`
- Test cases:
  - WebSocket handshake
  - Connection lifecycle
  - Message broadcast
  - Channel subscription
  - Reconnection flow
  - Message recovery
  - Concurrent connections (race detection)
  - Load test (1000 connections)
- E2E tests with Angular frontend
- Test coverage >80%
**Passes:** false

### Item 3.7.16 - API Documentation Update
**Type:** Documentation
**Description:** Document WebSocket API and HTTP fallback endpoints.
**Acceptance Criteria:**
- WebSocket API documentation:
  - Connection URL: `wss://api.devthread.io/ws`
  - Authentication (token query param or header)
  - Message types and formats
  - Event types
  - Error codes
- HTTP polling endpoint docs
- Client implementation guide
- Example code (JavaScript, Go)
- Swagger update for HTTP endpoints
**Passes:** false

## Affected Files
- `backend/cmd/realtime-service/main.go`
- `backend/internal/websocket/server.go`
- `backend/internal/websocket/connection.go`
- `backend/internal/websocket/manager.go`
- `backend/internal/websocket/protocol.go`
- `backend/internal/handlers/realtime_handler.go`
- `backend/internal/service/presence_service.go`
- `backend/internal/service/message_service.go`
- `backend/migrations/000003_create_messages_tables.up.sql`
- `backend/migrations/000003_create_messages_tables.down.sql`
- `src/app/shared/services/websocket.service.ts`
- `src/app/shared/services/notification-realtime.service.ts`
- `src/app/pages/messages/messages-realtime.service.ts`

## Affected Dependencies
- github.com/gorilla/websocket
- github.com/redis/go-redis/v9
- github.com/google/uuid
- github.com/gin-gonic/gin
- github.com/stretchr/testify
- github.com/testcontainers/testcontainers-go

## Notes
- Use Redis pub/sub for multi-instance scaling
- Implement rate limiting for messages (prevent spam)
- Store messages in PostgreSQL for persistence
- Consider message encryption at rest
- Monitor connection churn (connects/disconnects)
- Implement backpressure for slow clients
- Use compression for large messages
- Prepare for horizontal scaling (sticky sessions)
- GDPR compliance for message retention
