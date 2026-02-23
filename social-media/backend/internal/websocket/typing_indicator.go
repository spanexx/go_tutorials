package websocket

import (
	"time"

	"go.uber.org/zap"
)

// TypingUser represents a user's typing status
type TypingUser struct {
	UserID    string
	Username  string
	StartedAt time.Time
	Timer     *time.Timer
}

// TypingIndicatorPayload represents a typing indicator event
type TypingIndicatorPayload struct {
	ConversationID string `json:"conversation_id"`
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
	IsTyping       bool   `json:"is_typing"`
}

// StartTyping indicates a user started typing
func (mc *MessagingChannel) StartTyping(conversationID, userID, username string) error {
	channelID := mc.getConversationChannelID(conversationID)
	
	mc.typingMu.Lock()
	defer mc.typingMu.Unlock()

	// Initialize conversation typing map if needed
	if _, ok := mc.typingUsers[conversationID]; !ok {
		mc.typingUsers[conversationID] = make(map[string]*TypingUser)
	}

	// Check if user is already typing (debounce - max 1 per 2 seconds)
	if existing, ok := mc.typingUsers[conversationID][userID]; ok {
		if time.Since(existing.StartedAt) < 2*time.Second {
			// Debounce - don't send another typing event
			return nil
		}
		// Clear existing timer
		if existing.Timer != nil {
			existing.Timer.Stop()
		}
	}

	// Create typing user entry
	typingUser := &TypingUser{
		UserID:    userID,
		Username:  username,
		StartedAt: time.Now(),
	}

	// Set auto-clear timer (5 seconds of inactivity)
	typingUser.Timer = time.AfterFunc(5*time.Second, func() {
		mc.StopTyping(conversationID, userID, username)
	})

	mc.typingUsers[conversationID][userID] = typingUser

	// Broadcast typing_start event
	payload := TypingIndicatorPayload{
		ConversationID: conversationID,
		UserID:         userID,
		Username:       username,
		IsTyping:       true,
	}

	msg, err := NewMessageWithChannel("typing_start", payload, channelID)
	if err != nil {
		mc.logger.Error("Failed to create typing_start message", zap.Error(err))
		return err
	}

	mc.manager.BroadcastToChannel(channelID, msg)
	mc.logger.Debug("Typing start broadcast",
		zap.String("conversationID", conversationID),
		zap.String("userID", userID),
		zap.String("username", username))

	return nil
}

// StopTyping indicates a user stopped typing
func (mc *MessagingChannel) StopTyping(conversationID, userID, username string) error {
	channelID := mc.getConversationChannelID(conversationID)
	
	mc.typingMu.Lock()
	defer mc.typingMu.Unlock()

	// Remove typing user entry
	if convUsers, ok := mc.typingUsers[conversationID]; ok {
		if typingUser, ok := convUsers[userID]; ok {
			if typingUser.Timer != nil {
				typingUser.Timer.Stop()
			}
			delete(convUsers, userID)
		}
	}

	// Broadcast typing_stop event
	payload := TypingIndicatorPayload{
		ConversationID: conversationID,
		UserID:         userID,
		Username:       username,
		IsTyping:       false,
	}

	msg, err := NewMessageWithChannel("typing_stop", payload, channelID)
	if err != nil {
		mc.logger.Error("Failed to create typing_stop message", zap.Error(err))
		return err
	}

	mc.manager.BroadcastToChannel(channelID, msg)
	mc.logger.Debug("Typing stop broadcast",
		zap.String("conversationID", conversationID),
		zap.String("userID", userID),
		zap.String("username", username))

	return nil
}

// GetTypingUsers returns all users currently typing in a conversation
func (mc *MessagingChannel) GetTypingUsers(conversationID string) []TypingUser {
	mc.typingMu.RLock()
	defer mc.typingMu.RUnlock()

	var users []TypingUser
	if convUsers, ok := mc.typingUsers[conversationID]; ok {
		users = make([]TypingUser, 0, len(convUsers))
		for _, user := range convUsers {
			users = append(users, *user)
		}
	}
	return users
}

// ClearTyping clears all typing indicators for a conversation
func (mc *MessagingChannel) ClearTyping(conversationID string) {
	mc.typingMu.Lock()
	defer mc.typingMu.Unlock()

	if convUsers, ok := mc.typingUsers[conversationID]; ok {
		for _, user := range convUsers {
			if user.Timer != nil {
				user.Timer.Stop()
			}
		}
		delete(mc.typingUsers, conversationID)
	}
}
