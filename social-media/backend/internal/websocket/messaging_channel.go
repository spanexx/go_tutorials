package websocket

import (
	"database/sql"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// DirectMessage represents a direct message for persistence
type DirectMessage struct {
	ID             string     `json:"id"`
	ConversationID string     `json:"conversation_id"`
	SenderID       string     `json:"sender_id"`
	Content        string     `json:"content"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at,omitempty"`
	IsRead         bool       `json:"is_read"`
	ReadAt         *time.Time `json:"read_at,omitempty"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

// MessagingChannel manages real-time direct messaging
type MessagingChannel struct {
	manager         *ConnectionManager
	db              *sql.DB
	redisClient     *redis.Client
	logger          *zap.Logger
	mu              sync.RWMutex
	typingMu        sync.RWMutex
	typingUsers     map[string]map[string]*TypingUser // conversationID -> userID -> TypingUser
	presenceMu      sync.RWMutex
	userPresence    map[string]*UserPresence // userID -> UserPresence
	readReceiptMu   sync.RWMutex
	disabledReadReceipts map[string]bool // userID -> disabled
	recoveryMu      sync.RWMutex
	offlineMessages map[string][]*OfflineMessage // userID -> queued messages
	lastMessageID   map[string]int64 // userID -> last processed message sequence
	maxQueueSize    int
}

// NewMessagingChannel creates a new messaging channel manager
func NewMessagingChannel(
	manager *ConnectionManager,
	db *sql.DB,
	redisClient *redis.Client,
	logger *zap.Logger,
) *MessagingChannel {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &MessagingChannel{
		manager:              manager,
		db:                   db,
		redisClient:          redisClient,
		logger:               logger,
		typingUsers:          make(map[string]map[string]*TypingUser),
		userPresence:         make(map[string]*UserPresence),
		disabledReadReceipts: make(map[string]bool),
		offlineMessages:      make(map[string][]*OfflineMessage),
		lastMessageID:        make(map[string]int64),
		maxQueueSize:         100,
	}
}

// JoinConversation subscribes a user to a conversation channel
func (mc *MessagingChannel) JoinConversation(userID, conversationID, connID string) error {
	channelID := mc.getConversationChannelID(conversationID)
	mc.manager.AddConnectionToChannel(connID, channelID)
	mc.logger.Debug("User joined conversation channel",
		zap.String("userID", userID),
		zap.String("conversationID", conversationID),
		zap.String("channelID", channelID))
	return nil
}

// LeaveConversation unsubscribes a user from a conversation channel
func (mc *MessagingChannel) LeaveConversation(userID, conversationID, connID string) {
	channelID := mc.getConversationChannelID(conversationID)
	mc.manager.RemoveConnectionFromChannel(connID, channelID)
	mc.logger.Debug("User left conversation channel",
		zap.String("userID", userID),
		zap.String("conversationID", conversationID),
		zap.String("channelID", channelID))
}

// SendMessage sends a message in a conversation
func (mc *MessagingChannel) SendMessage(conversationID, senderID, content string) (*DirectMessage, error) {
	message := &DirectMessage{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		CreatedAt:      time.Now().UTC(),
		IsRead:         false,
	}

	// Persist message to database
	if err := mc.persistMessage(message); err != nil {
		mc.logger.Error("Failed to persist message", zap.Error(err))
		return nil, err
	}

	// Broadcast to conversation channel
	channelID := mc.getConversationChannelID(conversationID)
	msg, err := NewMessageWithChannel("message", message, channelID)
	if err != nil {
		mc.logger.Error("Failed to create message", zap.Error(err))
		return nil, err
	}

	mc.manager.BroadcastToChannel(channelID, msg)
	mc.logger.Debug("Message sent",
		zap.String("messageID", message.ID),
		zap.String("conversationID", conversationID),
		zap.String("senderID", senderID))

	return message, nil
}

// persistMessage persists a message to PostgreSQL
func (mc *MessagingChannel) persistMessage(message *DirectMessage) error {
	if mc.db == nil {
		return nil
	}

	query := `
		INSERT INTO messages (id, conversation_id, sender_id, content, created_at, is_read)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	err := mc.db.QueryRow(
		query,
		message.ID,
		message.ConversationID,
		message.SenderID,
		message.Content,
		message.CreatedAt,
		message.IsRead,
	).Scan(&message.ID, &message.CreatedAt)

	return err
}

// GetMessages retrieves messages for a conversation with pagination
func (mc *MessagingChannel) GetMessages(conversationID string, page, limit int) ([]*DirectMessage, error) {
	if mc.db == nil {
		return []*DirectMessage{}, nil
	}

	offset := (page - 1) * limit

	query := `
		SELECT id, conversation_id, sender_id, content, created_at, updated_at, is_read, read_at, deleted_at
		FROM messages
		WHERE conversation_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := mc.db.Query(query, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]*DirectMessage, 0)
	for rows.Next() {
		var msg DirectMessage
		err := rows.Scan(
			&msg.ID,
			&msg.ConversationID,
			&msg.SenderID,
			&msg.Content,
			&msg.CreatedAt,
			&msg.UpdatedAt,
			&msg.IsRead,
			&msg.ReadAt,
			&msg.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		messages = append(messages, &msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// DeleteMessage soft deletes a message
func (mc *MessagingChannel) DeleteMessage(messageID, userID string) error {
	if mc.db == nil {
		return nil
	}

	now := time.Now().UTC()

	// Only sender can delete
	query := `
		UPDATE messages
		SET deleted_at = $1
		WHERE id = $2 AND sender_id = $3
	`

	result, err := mc.db.Exec(query, now, messageID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	mc.logger.Debug("Message deleted", zap.String("messageID", messageID))
	return nil
}

// HandleOnlineMessage handles message delivery when recipient is online
func (mc *MessagingChannel) HandleOnlineMessage(message *DirectMessage) error {
	// Message is already broadcast via SendMessage
	return nil
}

// HandleOfflineMessage handles message delivery when recipient is offline
func (mc *MessagingChannel) HandleOfflineMessage(message *DirectMessage) error {
	// Queue message for offline user
	payload, _ := json.Marshal(message)
	mc.QueueMessageForUser(message.SenderID, "conversation:"+message.ConversationID, "message", payload)
	mc.logger.Debug("Offline message queued",
		zap.String("messageID", message.ID),
		zap.String("conversationID", message.ConversationID))
	return nil
}

// getConversationChannelID returns the channel ID for a conversation
func (mc *MessagingChannel) getConversationChannelID(conversationID string) string {
	return "conversation:" + conversationID
}
