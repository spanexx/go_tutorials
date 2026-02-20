# Milestone 3.6 - Messages Enhancement

## Problem Statement
Direct messaging is a core social feature. The messages system needs conversation list, chat interface, and message management.

## Success Metrics
- Users can see conversation list
- Users can send and receive messages
- Conversation view shows message history
- Messages have timestamps and read status
- Users can start new conversations

## Non-Goals
- Real-time messaging (WebSockets) (Phase 4)
- Group messaging (Phase 4)
- Message reactions (Phase 4)
- Voice/video calls (Phase 4)

## Items

### Item 3.6.1 - Conversation Model & Service
**Type:** Feature
**Description:** Define conversation and message models with service.
**Acceptance Criteria:**
- Conversation interface with id, participants, lastMessage, unreadCount, updatedAt
- Message interface with id, senderId, content, timestamp, read
- MessageService with methods: getConversations, getMessages, sendMessage, markAsRead
- Signal-based conversations state
- Mock data for development
**Passes:** false

### Item 3.6.2 - Conversation List Component
**Type:** Feature
**Description:** Create conversation list sidebar showing all chats.
**Acceptance Criteria:**
- List of conversations ordered by most recent
- Participant avatar and name
- Last message preview (truncated)
- Unread count badge
- Timestamp of last message
- Click to open conversation
- New conversation button
- Search conversations
**Passes:** false

### Item 3.6.3 - Chat Interface Component
**Type:** Feature
**Description:** Build the chat view with message history and input.
**Acceptance Criteria:**
- Header with participant info
- Message list (bubble style)
- Own messages right-aligned, others left
- Timestamp on messages
- Read indicators (placeholder)
- Typing indicator (placeholder)
- Scroll to bottom on new message
- Load more history on scroll up
**Passes:** false

### Item 3.6.4 - Message Input Component
**Type:** Feature
**Description:** Create message input with send functionality.
**Acceptance Criteria:**
- Text input field
- Send button (disabled when empty)
- Enter key to send
- Auto-resize textarea
- Emoji picker (placeholder)
- File attachment (placeholder)
- Typing indicator trigger
**Passes:** false

### Item 3.6.5 - New Conversation Flow
**Type:** Feature
**Description:** Implement starting new conversations with users.
**Acceptance Criteria:**
- "New message" button
- User search/select dialog
- Search users by name/username
- Select user to start conversation
- Prevent duplicate conversations
- Navigate to new conversation
**Passes:** false

## Affected Files
- `src/app/shared/models/conversation.model.ts`
- `src/app/shared/models/message.model.ts`
- `src/app/shared/services/message.service.ts`
- `src/app/pages/messages/messages.component.ts`
- `src/app/shared/components/conversation-list/conversation-list.component.ts`
- `src/app/shared/components/chat-interface/chat-interface.component.ts`
- `src/app/shared/components/message-input/message-input.component.ts`

## Affected Dependencies
- None

## Notes
- Mock messages initially
- Prepare for WebSocket real-time in Phase 4
