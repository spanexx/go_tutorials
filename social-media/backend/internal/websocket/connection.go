package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// Connection represents a WebSocket connection
type Connection struct {
	ID           string
	UserID       string
	Socket       *websocket.Conn
	sendChan     chan *Message
	Channels     map[string]bool
	LastActivity time.Time
	LastSeen     time.Time
	UserAgent    string
	mu           sync.RWMutex
	logger       *zap.Logger
}

// NewConnection creates a new WebSocket connection
func NewConnection(userID string, socket *websocket.Conn, logger *zap.Logger) *Connection {
	return &Connection{
		ID:           generateConnectionID(),
		UserID:       userID,
		Socket:       socket,
		sendChan:     make(chan *Message, 256),
		Channels:     make(map[string]bool),
		LastActivity: time.Now(),
		LastSeen:     time.Now(),
		UserAgent:    "",
		logger:       logger,
	}
}

// NewConnectionWithMetadata creates a new WebSocket connection with metadata
func NewConnectionWithMetadata(userID, userAgent string, socket *websocket.Conn, logger *zap.Logger) *Connection {
	return &Connection{
		ID:           generateConnectionID(),
		UserID:       userID,
		Socket:       socket,
		sendChan:     make(chan *Message, 256),
		Channels:     make(map[string]bool),
		LastActivity: time.Now(),
		LastSeen:     time.Now(),
		UserAgent:    userAgent,
		logger:       logger,
	}
}

// SetUserAgent sets the user agent for this connection
func (c *Connection) SetUserAgent(userAgent string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.UserAgent = userAgent
}

// UpdateLastSeen updates the last seen timestamp
func (c *Connection) UpdateLastSeen() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.LastSeen = time.Now()
}

// HandleMessages handles reading and writing messages for this connection
func (c *Connection) HandleMessages(ctx context.Context, manager *ConnectionManager, notificationChannel *NotificationChannel, messagingChannel *MessagingChannel) {
	defer func() {
		// Unsubscribe from notification channel
		if notificationChannel != nil {
			notificationChannel.Unsubscribe(c.UserID, c.ID)
		}
		// Set user offline (with debounce)
		if messagingChannel != nil {
			messagingChannel.SetUserOffline(c.UserID)
		}
		manager.Unregister <- c
		c.Socket.Close()
		c.logger.Info("WebSocket connection closed", zap.String("userID", c.UserID))
	}()

	// Set user online on connect
	if messagingChannel != nil {
		messagingChannel.SetUserOnline(c.UserID)
	}

	// Start ping/pong heartbeat
	c.startHeartbeat(ctx)

	// Start writer
	go c.writer(ctx)

	// Start reader
	c.reader(ctx, manager, notificationChannel, messagingChannel)
}

// Send sends a message to this connection
func (c *Connection) Send(msg *Message) error {
	select {
	case c.sendChan <- msg:
		return nil
	default:
		// Channel full, connection might be slow
		return ErrChannelFull
	}
}

// Close closes the connection
func (c *Connection) Close() error {
	close(c.sendChan)
	return c.Socket.Close()
}

// JoinChannel joins a channel/room
func (c *Connection) JoinChannel(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Channels[channelID] = true
}

// LeaveChannel leaves a channel/room
func (c *Connection) LeaveChannel(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.Channels, channelID)
}

// IsInChannel checks if connection is in a channel
func (c *Connection) IsInChannel(channelID string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Channels[channelID]
}

// GetChannels returns all channels the connection is in
func (c *Connection) GetChannels() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	channels := make([]string, 0, len(c.Channels))
	for ch := range c.Channels {
		channels = append(channels, ch)
	}
	return channels
}

// UpdateActivity updates the last activity timestamp
func (c *Connection) UpdateActivity() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.LastActivity = time.Now()
}

// writer writes messages to the WebSocket connection
func (c *Connection) writer(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-c.sendChan:
			if !ok {
				// Channel closed
				return
			}

			c.Socket.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Socket.WriteJSON(msg); err != nil {
				c.logger.Error("WebSocket write error", zap.Error(err))
				return
			}
		case <-ticker.C:
			// Send ping
			c.Socket.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Socket.WriteMessage(websocket.PingMessage, nil); err != nil {
				c.logger.Error("WebSocket ping error", zap.Error(err))
				return
			}
		}
	}
}

// reader reads messages from the WebSocket connection
func (c *Connection) reader(ctx context.Context, manager *ConnectionManager, notificationChannel *NotificationChannel, messagingChannel *MessagingChannel) {
	c.Socket.SetReadLimit(512 * 1024) // 512KB max message size
	c.Socket.SetReadDeadline(time.Now().Add(60 * time.Second))

	// Setup pong handler for heartbeat
	c.Socket.SetPongHandler(func(string) error {
		c.UpdateActivity()
		c.Socket.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		select {
		case <-ctx.Done():
			return
		default:
			var msg Message
			if err := c.Socket.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					c.logger.Error("WebSocket read error", zap.Error(err))
				}
				return
			}

			c.UpdateActivity()
			c.handleMessage(ctx, manager, notificationChannel, messagingChannel, &msg)
		}
	}
}

// handleMessage processes incoming messages
func (c *Connection) handleMessage(ctx context.Context, manager *ConnectionManager, notificationChannel *NotificationChannel, messagingChannel *MessagingChannel, msg *Message) {
	switch msg.Type {
	case MsgTypeConnect:
		// Handle connection message
		c.handleConnect(manager)
	case MsgTypeDisconnect:
		// Handle disconnect
		c.handleDisconnect(manager)
	case "subscribe":
		// Handle channel subscription
		c.handleSubscribe(msg, manager)
	case "unsubscribe":
		// Handle channel unsubscription
		c.handleUnsubscribe(msg, manager)
	case "conversation_join":
		// Join conversation channel
		if messagingChannel != nil {
			var payload struct {
				ConversationID string `json:"conversation_id"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.JoinConversation(c.UserID, payload.ConversationID, c.ID)
			}
		}
	case "conversation_leave":
		// Leave conversation channel
		if messagingChannel != nil {
			var payload struct {
				ConversationID string `json:"conversation_id"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.LeaveConversation(c.UserID, payload.ConversationID, c.ID)
			}
		}
	case "send_message":
		// Send message in conversation
		if messagingChannel != nil {
			var payload struct {
				ConversationID string `json:"conversation_id"`
				Content        string `json:"content"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.SendMessage(payload.ConversationID, c.UserID, payload.Content)
			}
		}
	case "mark_read":
		// Mark messages as read
		if messagingChannel != nil {
			var payload struct {
				ConversationID string   `json:"conversation_id"`
				MessageIDs     []string `json:"message_ids"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.MarkAsRead(payload.ConversationID, c.UserID, payload.MessageIDs)
			}
		}
	case "notification_subscribe":
		// Subscribe to notification channel
		if notificationChannel != nil {
			notificationChannel.Subscribe(c.UserID, c.ID)
		}
	case "notification_unsubscribe":
		// Unsubscribe from notification channel
		if notificationChannel != nil {
			notificationChannel.Unsubscribe(c.UserID, c.ID)
		}
	case "typing_start":
		// Handle typing start
		if messagingChannel != nil {
			var payload struct {
				ConversationID string `json:"conversation_id"`
				Username       string `json:"username"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.StartTyping(payload.ConversationID, c.UserID, payload.Username)
			}
		}
	case "typing_stop":
		// Handle typing stop
		if messagingChannel != nil {
			var payload struct {
				ConversationID string `json:"conversation_id"`
				Username       string `json:"username"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.StopTyping(payload.ConversationID, c.UserID, payload.Username)
			}
		}
	case "set_presence":
		// Manual presence status change
		if messagingChannel != nil {
			var payload struct {
				Status string `json:"status"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				var status PresenceStatus
				switch payload.Status {
				case "online":
					status = PresenceOnline
				case "offline":
					status = PresenceOffline
				case "away":
					status = PresenceAway
				case "busy":
					status = PresenceBusy
				default:
					status = PresenceOnline
				}
				messagingChannel.SetUserStatus(c.UserID, status)
			}
		}
	case "set_read_receipts":
		// Enable/disable read receipts
		if messagingChannel != nil {
			var payload struct {
				Enabled bool `json:"enabled"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				messagingChannel.SetReadReceiptsEnabled(c.UserID, payload.Enabled)
			}
		}
	case "get_missed_messages":
		// Get messages missed since last sequence
		if messagingChannel != nil {
			var payload struct {
				LastSequence int64 `json:"last_sequence"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err == nil {
				missed := messagingChannel.GetMissedMessages(c.UserID, payload.LastSequence)
				// Send missed messages
				for _, m := range missed {
					recoveryMsg, err := NewMessageWithChannel(MessageType(m.MessageType), json.RawMessage(m.Payload), m.Channel)
					if err == nil {
						c.Send(recoveryMsg)
					}
				}
				// Clear queue after delivery
				messagingChannel.ClearUserQueue(c.UserID)
				messagingChannel.SetLastMessageID(c.UserID, time.Now().UnixNano())
			}
		}
	case "read_receipt":
		// Handle read receipt - forward to messaging channel
		c.logger.Debug("Read receipt received", zap.String("userID", c.UserID))
	default:
		c.logger.Debug("Unknown message type", zap.String("type", string(msg.Type)))
	}
}

// handleConnect handles connection message
func (c *Connection) handleConnect(manager *ConnectionManager) {
	// Send acknowledgment
	c.Send(&Message{
		Type:      MsgTypeAck,
		Timestamp: time.Now(),
	})
}

// handleDisconnect handles disconnect message
func (c *Connection) handleDisconnect(manager *ConnectionManager) {
	// Connection will be cleaned up by defer in HandleMessages
}

// handleSubscribe handles channel subscription
func (c *Connection) handleSubscribe(msg *Message, manager *ConnectionManager) {
	var channel string
	if err := json.Unmarshal(msg.Payload, &channel); err != nil {
		c.logger.Error("Failed to unmarshal subscribe payload", zap.Error(err))
		return
	}
	if channel != "" {
		manager.AddConnectionToChannel(c.ID, channel)
		c.logger.Debug("Connection joined channel", zap.String("userID", c.UserID), zap.String("channel", channel))
	}
}

// handleUnsubscribe handles channel unsubscription
func (c *Connection) handleUnsubscribe(msg *Message, manager *ConnectionManager) {
	var channel string
	if err := json.Unmarshal(msg.Payload, &channel); err != nil {
		c.logger.Error("Failed to unmarshal unsubscribe payload", zap.Error(err))
		return
	}
	if channel != "" {
		manager.RemoveConnectionFromChannel(c.ID, channel)
		c.logger.Debug("Connection left channel", zap.String("userID", c.UserID), zap.String("channel", channel))
	}
}

// handleTypingStart handles typing start event
func (c *Connection) handleTypingStart(hub *Hub, msg *Message) {
	// Forward typing event to conversation participants
	// Implementation in messaging channel
}

// handleTypingStop handles typing stop event
func (c *Connection) handleTypingStop(hub *Hub, msg *Message) {
	// Forward typing event to conversation participants
	// Implementation in messaging channel
}

// handleReadReceipt handles read receipt event
func (c *Connection) handleReadReceipt(hub *Hub, msg *Message) {
	// Forward read receipt to message sender
	// Implementation in messaging channel
}

// startHeartbeat starts the ping/pong heartbeat
func (c *Connection) startHeartbeat(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Check if connection is stale
				c.mu.RLock()
				lastActivity := c.LastActivity
				c.mu.RUnlock()

				if time.Since(lastActivity) > 90*time.Second {
					c.logger.Warn("Connection stale, closing", zap.String("userID", c.UserID))
					c.Close()
					return
				}
			}
		}
	}()
}
