package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Connection messages
	MsgTypeConnect    MessageType = "connect"
	MsgTypeDisconnect MessageType = "disconnect"

	// Notification messages
	MsgTypeNotification MessageType = "notification"

	// Messaging messages
	MsgTypeMessage     MessageType = "message"
	MsgTypeTypingStart MessageType = "typing_start"
	MsgTypeTypingStop  MessageType = "typing_stop"
	MsgTypeReadReceipt MessageType = "read_receipt"

	// Presence messages
	MsgTypePresence MessageType = "presence"

	// Feed updates
	MsgTypeFeedUpdate  MessageType = "feed_update"
	MsgTypeCountUpdate MessageType = "count_update"

	// System messages
	MsgTypeAck       MessageType = "ack"
	MsgTypeError     MessageType = "error"
	MsgTypeHeartbeat MessageType = "heartbeat"
)

// Message represents a WebSocket message
type Message struct {
	ID        string          `json:"id"`
	Type      MessageType     `json:"type"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Channel   string          `json:"channel,omitempty"`
	AckID     string          `json:"ack_id,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// NewMessage creates a new WebSocket message
func NewMessage(msgType MessageType, payload interface{}) (*Message, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return &Message{
		ID:        uuid.New().String(),
		Type:      msgType,
		Payload:   payloadBytes,
		Timestamp: time.Now().UTC(),
	}, nil
}

// NewMessageWithChannel creates a new WebSocket message with channel
func NewMessageWithChannel(msgType MessageType, payload interface{}, channel string) (*Message, error) {
	msg, err := NewMessage(msgType, payload)
	if err != nil {
		return nil, err
	}
	msg.Channel = channel
	return msg, nil
}

// AckMessage represents an acknowledgment message
type AckMessage struct {
	AckID   string `json:"ack_id"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// ErrorMessage represents an error message
type ErrorMessage struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Error codes
const (
	ErrCodeUnauthorized    = "UNAUTHORIZED"
	ErrCodeInvalidMessage  = "INVALID_MESSAGE"
	ErrCodeChannelNotFound = "CHANNEL_NOT_FOUND"
	ErrCodeRateLimited     = "RATE_LIMITED"
	ErrCodeInternalError   = "INTERNAL_ERROR"
)

// NotificationPayload represents a notification to be delivered
type NotificationPayload struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	UserID    string    `json:"user_id"`
	ActorID   string    `json:"actor_id"`
	ActorName string    `json:"actor_name"`
	PostID    *string   `json:"post_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	Read      bool      `json:"read"`
}

// Message payload for direct messaging
type MessagePayload struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
	IsRead         bool      `json:"is_read"`
}

// Typing payload
type TypingPayload struct {
	ConversationID string `json:"conversation_id"`
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
}

// Presence payload
type PresencePayload struct {
	UserID   string         `json:"user_id"`
	Status   PresenceStatus `json:"status"`
	LastSeen *time.Time     `json:"last_seen,omitempty"`
}

// PresenceStatus represents user presence status
type PresenceStatus string

const (
	PresenceOnline  PresenceStatus = "online"
	PresenceOffline PresenceStatus = "offline"
	PresenceAway    PresenceStatus = "away"
	PresenceBusy    PresenceStatus = "busy"
)

// Read receipt payload
type ReadReceiptPayload struct {
	ConversationID string   `json:"conversation_id"`
	MessageIDs     []string `json:"message_ids"`
	ReadAt         string   `json:"read_at"`
}

// Feed update payload
type FeedUpdatePayload struct {
	Type   string `json:"type"`
	PostID string `json:"post_id"`
	UserID string `json:"user_id,omitempty"`
}

// Count update payload
type CountUpdatePayload struct {
	PostID   string `json:"post_id"`
	Likes    *int   `json:"likes,omitempty"`
	Comments *int   `json:"comments,omitempty"`
	Shares   *int   `json:"shares,omitempty"`
}
