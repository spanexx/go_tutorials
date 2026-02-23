# Realtime Service API Documentation

## Overview

The Realtime Service provides WebSocket-based real-time communication for the SocialHub application, enabling live notifications, messaging, presence updates, and feed updates.

**Service URL:** `wss://api.devthread.io/ws`  
**HTTP Polling Fallback:** `GET/POST /api/v1/realtime/poll`  
**Port:** 8082

---

## Table of Contents

1. [Connection](#connection)
2. [Authentication](#authentication)
3. [Message Protocol](#message-protocol)
4. [Event Types](#event-types)
5. [Channels](#channels)
6. [HTTP Polling Fallback](#http-polling-fallback)
7. [Client Implementation Guide](#client-implementation-guide)

---

## Connection

### WebSocket Connection URL

```
wss://api.devthread.io/ws?token=<JWT_TOKEN>
```

### Connection Parameters

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| token     | string | Yes      | JWT authentication token from login  |

### Connection Response

On successful connection, the server does not send a specific response. The connection is established and ready to receive/send messages.

### Connection Error Responses

| Status Code | Error                    | Description                           |
|-------------|--------------------------|---------------------------------------|
| 401         | `missing token`          | No token provided in query parameter  |
| 401         | `invalid token`          | Token is malformed or invalid         |
| 401         | `token expired`          | Token has expired                     |

---

## Authentication

### JWT Token Authentication

Authentication is performed via JWT token passed in the WebSocket connection URL query parameter.

**Token Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiZXhwIjoxNzA5MzI4MDAwfQ.abc123
```

**Token Claims:**
- `user_id`: User's unique identifier
- `exp`: Token expiration timestamp
- `iat`: Token issued at timestamp

**Example Connection:**
```javascript
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`wss://api.devthread.io/ws?token=${token}`);
```

---

## Message Protocol

### Message Structure

All messages follow this JSON structure:

```json
{
  "id": "msg_1234567890_abcdef",
  "type": "message_type",
  "payload": { ... },
  "channel": "channel_name",
  "ack_id": "ack_123",
  "timestamp": "2024-03-01T12:00:00Z"
}
```

### Message Fields

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| id         | string | Yes      | Unique message identifier (UUID format)        |
| type       | string | Yes      | Message type (see Event Types below)           |
| payload    | object | Yes      | Message-specific data                          |
| channel    | string | No       | Target channel for the message                 |
| ack_id     | string | No       | Acknowledgment ID for request/response pattern |
| timestamp  | string | Yes      | ISO 8601 formatted timestamp                   |

---

## Event Types

### Connection Events

#### `connect`
Sent when client successfully connects.

**Payload:**
```json
{
  "user_id": "123",
  "timestamp": "2024-03-01T12:00:00Z"
}
```

#### `disconnect`
Sent when client disconnects.

**Payload:**
```json
{
  "reason": "client_initiated"
}
```

### Subscription Events

#### `subscribe`
Subscribe to a channel.

**Payload:**
```json
{
  "channel": "notifications"
}
```

#### `unsubscribe`
Unsubscribe from a channel.

**Payload:**
```json
{
  "channel": "notifications"
}
```

### Notification Events

#### `notification`
New notification received.

**Payload:**
```json
{
  "id": "notif_123",
  "type": "like",
  "actor_id": "456",
  "actor_name": "John Doe",
  "message": "John liked your post",
  "post_id": "post_789",
  "read": false,
  "created_at": "2024-03-01T12:00:00Z"
}
```

#### `notification_read`
Mark notification as read.

**Payload:**
```json
{
  "notification_id": "notif_123",
  "read_at": "2024-03-01T12:05:00Z"
}
```

#### `notification_read_all`
Mark all notifications as read.

**Payload:**
```json
{
  "read_at": "2024-03-01T12:05:00Z"
}
```

### Messaging Events

#### `message`
New direct message received.

**Payload:**
```json
{
  "id": "msg_123",
  "conversation_id": "conv_456",
  "sender_id": "789",
  "content": "Hello!",
  "created_at": "2024-03-01T12:00:00Z",
  "is_read": false,
  "sender": {
    "id": "789",
    "username": "jane",
    "display_name": "Jane Doe",
    "avatar_url": "https://..."
  }
}
```

#### `typing_start`
User started typing.

**Payload:**
```json
{
  "conversation_id": "conv_456",
  "user_id": "789",
  "username": "jane",
  "is_typing": true
}
```

#### `typing_stop`
User stopped typing.

**Payload:**
```json
{
  "conversation_id": "conv_456",
  "user_id": "789",
  "username": "jane",
  "is_typing": false
}
```

#### `read_receipt`
Message read receipt.

**Payload:**
```json
{
  "conversation_id": "conv_456",
  "message_ids": ["msg_1", "msg_2"],
  "read_at": "2024-03-01T12:05:00Z"
}
```

### Presence Events

#### `presence`
User presence status changed.

**Payload:**
```json
{
  "user_id": "123",
  "status": "online",
  "last_seen": "2024-03-01T12:00:00Z"
}
```

**Presence Status Values:**
- `online`: User is actively connected
- `offline`: User is disconnected
- `away`: User is idle
- `busy`: User set status to busy

### Feed Events

#### `feed_update`
Feed content updated.

**Payload:**
```json
{
  "type": "new_post",
  "post_id": "post_123",
  "user_id": "456",
  "username": "john",
  "action": "created",
  "created_at": "2024-03-01T12:00:00Z"
}
```

#### `count_update`
Feed count updated.

**Payload:**
```json
{
  "new_posts_count": 5,
  "last_update": "2024-03-01T12:00:00Z"
}
```

### System Events

#### `ack`
Acknowledgment response.

**Payload:**
```json
{
  "ack_id": "ack_123",
  "status": "success",
  "data": { ... }
}
```

#### `error`
Error message.

**Payload:**
```json
{
  "code": "INVALID_MESSAGE",
  "message": "Message type is required",
  "details": { ... }
}
```

#### `heartbeat`
Heartbeat/ping-pong for connection health.

**Payload:**
```json
{
  "timestamp": "2024-03-01T12:00:00Z"
}
```

---

## Channels

### Channel Types

| Channel              | Description                          | Auto-Subscribe |
|----------------------|--------------------------------------|----------------|
| `notifications`      | User notifications                   | Yes            |
| `presence`           | Global presence updates              | No             |
| `presence:{userId}`  | Specific user presence               | No             |
| `conversation:{id}`  | Direct message conversation          | No             |
| `feed:updates`       | Feed update notifications            | No             |

### Channel Operations

#### Subscribe to Channel

```json
{
  "id": "msg_123",
  "type": "subscribe",
  "payload": {
    "channel": "conversation:conv_456"
  }
}
```

#### Unsubscribe from Channel

```json
{
  "id": "msg_124",
  "type": "unsubscribe",
  "payload": {
    "channel": "conversation:conv_456"
  }
}
```

---

## HTTP Polling Fallback

For clients that cannot use WebSocket, HTTP long polling is available.

### GET /api/v1/realtime/poll

Poll for new events.

**Query Parameters:**

| Parameter    | Type   | Required | Default | Description                        |
|--------------|--------|----------|---------|------------------------------------|
| user_id      | string | Yes      | -       | User ID for authentication         |
| last_poll_id | number | No       | 0       | Last received event ID             |
| timeout      | number | No       | 30      | Long poll timeout in seconds (max 30) |

**Request Example:**
```
GET /api/v1/realtime/poll?user_id=123&last_poll_id=456&timeout=30
```

**Response Example:**
```json
{
  "events": [
    {
      "id": 789,
      "type": "notification",
      "channel": "notifications",
      "payload": { ... },
      "timestamp": "2024-03-01T12:00:00Z"
    }
  ],
  "last_poll_id": 789,
  "has_more": false
}
```

### POST /api/v1/realtime/poll

Poll for new events with JSON body.

**Request Body:**
```json
{
  "user_id": "123",
  "last_poll_id": 456
}
```

**Response:** Same as GET endpoint.

### GET /api/v1/realtime/poll/missed

Get missed messages since last sequence.

**Query Parameters:**

| Parameter     | Type   | Required | Description                    |
|---------------|--------|----------|--------------------------------|
| user_id       | string | Yes      | User ID                        |
| last_sequence | number | Yes      | Last known message sequence    |

**Request Example:**
```
GET /api/v1/realtime/poll/missed?user_id=123&last_sequence=456
```

**Response Example:**
```json
{
  "messages": [
    {
      "id": "msg_789",
      "type": "message",
      "payload": { ... }
    }
  ]
}
```

---

## Client Implementation Guide

### JavaScript/TypeScript Client

```typescript
import { WebSocketService } from './websocket.service';

// Initialize service
const wsService = new WebSocketService();

// Connect with JWT token
wsService.connect(jwtToken, userId);

// Subscribe to notifications
wsService.subscribe('notifications');

// Listen for notifications
wsService.on('notification').subscribe((msg) => {
  console.log('New notification:', msg.payload);
});

// Send typing indicator
wsService.send({
  type: 'typing_start',
  channel: 'conversation:conv_123',
  payload: {
    conversation_id: 'conv_123',
    user_id: userId,
    username: 'john'
  }
});

// Disconnect
wsService.disconnect();
```

### Angular Integration

The Angular WebSocket service provides:

- **Automatic reconnection** with exponential backoff
- **Message queuing** while disconnected
- **Connection status** observable
- **HTTP polling fallback** when WebSocket unavailable

```typescript
// Connection status
wsService.status$.subscribe(status => {
  switch(status) {
    case ConnectionStatus.CONNECTED:
      console.log('Connected');
      break;
    case ConnectionStatus.RECONNECTING:
      console.log('Reconnecting...');
      break;
  }
});

// Send with acknowledgment
wsService.sendWithAck({
  type: 'message',
  channel: 'conversation:conv_123',
  payload: { content: 'Hello' }
}, 5000).subscribe(response => {
  console.log('Message acknowledged:', response);
});
```

### Reconnection Strategy

The client implements automatic reconnection with:

- **Exponential backoff**: 1s, 2s, 4s, 8s, 16s, 30s (max)
- **Maximum attempts**: 10 before falling back to HTTP polling
- **Message queue**: Messages queued while disconnected are sent on reconnect

### Best Practices

1. **Always handle connection status** - Monitor `status$` observable
2. **Implement message acknowledgment** - Use `sendWithAck()` for critical messages
3. **Clean up subscriptions** - Unsubscribe from channels when navigating away
4. **Handle reconnection gracefully** - Show UI indicators during reconnection
5. **Use HTTP polling fallback** - For environments blocking WebSocket connections

---

## Error Codes

| Code                    | HTTP Status | Description                          |
|-------------------------|-------------|--------------------------------------|
| `MISSING_TOKEN`         | 401         | No JWT token provided                |
| `INVALID_TOKEN`         | 401         | Token is malformed                   |
| `TOKEN_EXPIRED`         | 401         | Token has expired                    |
| `INVALID_MESSAGE`       | 400         | Message format is invalid            |
| `CHANNEL_NOT_FOUND`     | 404         | Channel does not exist               |
| `MAX_CONNECTIONS`       | 429         | Maximum connections per user reached |
| `RATE_LIMITED`          | 429         | Too many requests                    |
| `INTERNAL_ERROR`        | 500         | Server internal error                |

---

## Rate Limiting

- **Messages per second**: 100
- **Connections per user**: 10
- **Polling requests per minute**: 30

Rate limit headers are included in HTTP responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709328000
```

---

## Version History

| Version | Date       | Changes                              |
|---------|------------|--------------------------------------|
| v1.0    | 2024-03-01 | Initial release                      |
| v1.1    | 2024-03-15 | Added presence system                |
| v1.2    | 2024-03-20 | Added typing indicators              |
| v1.3    | 2024-03-25 | Added read receipts                  |
| v1.4    | 2024-03-28 | Added reconnection & recovery        |
| v1.5    | 2024-03-30 | Added HTTP polling fallback          |
