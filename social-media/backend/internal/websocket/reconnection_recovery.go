package websocket

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"
)

// OfflineMessage represents a message queued for offline user
type OfflineMessage struct {
	Sequence    int64     `json:"sequence"`
	Channel     string    `json:"channel"`
	MessageType string    `json:"type"`
	Payload     []byte    `json:"payload"`
	Timestamp   time.Time `json:"timestamp"`
}

// GenerateSequence generates a unique sequence number for message ordering
func (mc *MessagingChannel) GenerateSequence() int64 {
	return time.Now().UnixNano()
}

// QueueMessageForUser queues a message for an offline user
func (mc *MessagingChannel) QueueMessageForUser(userID, channel, messageType string, payload []byte) {
	mc.recoveryMu.Lock()
	defer mc.recoveryMu.Unlock()

	sequence := mc.GenerateSequence()
	
	offlineMsg := &OfflineMessage{
		Sequence:    sequence,
		Channel:     channel,
		MessageType: messageType,
		Payload:     payload,
		Timestamp:   time.Now(),
	}

	// Initialize queue if needed
	if _, ok := mc.offlineMessages[userID]; !ok {
		mc.offlineMessages[userID] = make([]*OfflineMessage, 0)
	}

	// Add to queue
	mc.offlineMessages[userID] = append(mc.offlineMessages[userID], offlineMsg)

	// Enforce max queue size
	if len(mc.offlineMessages[userID]) > mc.maxQueueSize {
		// Remove oldest messages
		mc.offlineMessages[userID] = mc.offlineMessages[userID][len(mc.offlineMessages[userID])-mc.maxQueueSize:]
	}

	mc.logger.Debug("Message queued for offline user",
		zap.String("userID", userID),
		zap.Int64("sequence", sequence),
		zap.String("channel", channel))
}

// GetMissedMessages returns messages missed since lastSequence for a user
func (mc *MessagingChannel) GetMissedMessages(userID string, lastSequence int64) []*OfflineMessage {
	mc.recoveryMu.RLock()
	defer mc.recoveryMu.RUnlock()

	messages, ok := mc.offlineMessages[userID]
	if !ok {
		return nil
	}

	// Filter messages newer than lastSequence
	var missed []*OfflineMessage
	for _, msg := range messages {
		if msg.Sequence > lastSequence {
			missed = append(missed, msg)
		}
	}

	return missed
}

// ClearUserQueue clears the message queue for a user after successful reconnection
func (mc *MessagingChannel) ClearUserQueue(userID string) {
	mc.recoveryMu.Lock()
	defer mc.recoveryMu.Unlock()

	delete(mc.offlineMessages, userID)
	mc.logger.Debug("Message queue cleared for user", zap.String("userID", userID))
}

// SetLastMessageID sets the last processed message sequence for a user
func (mc *MessagingChannel) SetLastMessageID(userID string, sequence int64) {
	mc.recoveryMu.Lock()
	defer mc.recoveryMu.Unlock()

	mc.lastMessageID[userID] = sequence
}

// GetLastMessageID returns the last processed message sequence for a user
func (mc *MessagingChannel) GetLastMessageID(userID string) int64 {
	mc.recoveryMu.RLock()
	defer mc.recoveryMu.RUnlock()

	return mc.lastMessageID[userID]
}

// GenerateReconnectionToken generates a token for session recovery
func (mc *MessagingChannel) GenerateReconnectionToken(userID string) string {
	// Simple token generation (in production, use JWT or similar)
	token := fmt.Sprintf("reconnect_%s_%d", userID, time.Now().UnixNano())
	
	// Store token with expiry (could use Redis for distributed systems)
	return token
}

// ValidateReconnectionToken validates a reconnection token
func (mc *MessagingChannel) ValidateReconnectionToken(token, userID string) bool {
	// Simple validation (in production, verify token signature and expiry)
	return strings.HasPrefix(token, fmt.Sprintf("reconnect_%s_", userID))
}

// MarshalJSON implements json.Marshaler for DirectMessage
func (m *DirectMessage) MarshalJSON() ([]byte, error) {
	type Alias DirectMessage
	return json.Marshal(&struct {
		*Alias
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at,omitempty"`
		ReadAt    string `json:"read_at,omitempty"`
		DeletedAt string `json:"deleted_at,omitempty"`
	}{
		Alias:     (*Alias)(m),
		CreatedAt: m.CreatedAt.Format(time.RFC3339),
		UpdatedAt: formatTime(m.UpdatedAt),
		ReadAt:    formatTime(m.ReadAt),
		DeletedAt: formatTime(m.DeletedAt),
	})
}

// MarshalJSON implements json.Marshaler for UserPresence
func (p *UserPresence) MarshalJSON() ([]byte, error) {
	type Alias UserPresence
	return json.Marshal(&struct {
		*Alias
		LastSeen string `json:"last_seen"`
	}{
		Alias:    (*Alias)(p),
		LastSeen: p.LastSeen.Format(time.RFC3339),
	})
}

// formatTime formats a time pointer to RFC3339 string
func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}
