package websocket

import (
	"time"

	"go.uber.org/zap"
)

// UserPresence represents a user's presence status
type UserPresence struct {
	UserID   string
	Status   PresenceStatus
	LastSeen time.Time
	Timer    *time.Timer
}

// SetUserOnline sets a user's presence to online
func (mc *MessagingChannel) SetUserOnline(userID string) error {
	mc.presenceMu.Lock()
	defer mc.presenceMu.Unlock()

	// Cancel existing offline timer
	if existing, ok := mc.userPresence[userID]; ok {
		if existing.Timer != nil {
			existing.Timer.Stop()
		}
	}

	// Set user as online
	mc.userPresence[userID] = &UserPresence{
		UserID:   userID,
		Status:   PresenceOnline,
		LastSeen: time.Now(),
	}

	// Broadcast presence update to presence channel
	payload := PresencePayload{
		UserID:   userID,
		Status:   PresenceOnline,
		LastSeen: nil,
	}

	msg, err := NewMessageWithChannel("presence", payload, "presence")
	if err != nil {
		mc.logger.Error("Failed to create presence message", zap.Error(err))
		return err
	}

	mc.manager.BroadcastToChannel("presence", msg)
	mc.logger.Debug("User set online", zap.String("userID", userID))

	return nil
}

// SetUserOffline sets a user's presence to offline with debounce
func (mc *MessagingChannel) SetUserOffline(userID string) error {
	mc.presenceMu.Lock()
	defer mc.presenceMu.Unlock()

	// Set up debounce timer (3 seconds)
	if existing, ok := mc.userPresence[userID]; ok {
		if existing.Timer != nil {
			existing.Timer.Stop()
		}
		// Start debounce timer
		existing.Timer = time.AfterFunc(3*time.Second, func() {
			mc.finalizeOffline(userID)
		})
		return nil
	}

	// User not in presence map, create entry with timer
	presence := &UserPresence{
		UserID:   userID,
		Status:   PresenceOnline, // Still online during debounce
		LastSeen: time.Now(),
		Timer:    time.AfterFunc(3*time.Second, func() {
			mc.finalizeOffline(userID)
		}),
	}
	mc.userPresence[userID] = presence

	return nil
}

// finalizeOffline finalizes the offline status after debounce
func (mc *MessagingChannel) finalizeOffline(userID string) {
	mc.presenceMu.Lock()
	defer mc.presenceMu.Unlock()

	now := time.Now()
	if existing, ok := mc.userPresence[userID]; ok {
		existing.Status = PresenceOffline
		existing.LastSeen = now
		existing.Timer = nil

		// Broadcast presence update
		payload := PresencePayload{
			UserID:   userID,
			Status:   PresenceOffline,
			LastSeen: &now,
		}

		msg, err := NewMessageWithChannel("presence", payload, "presence")
		if err != nil {
			mc.logger.Error("Failed to create presence message", zap.Error(err))
			return
		}

		mc.manager.BroadcastToChannel("presence", msg)
		mc.logger.Debug("User set offline", zap.String("userID", userID))
	}
}

// SetUserStatus manually sets a user's presence status
func (mc *MessagingChannel) SetUserStatus(userID string, status PresenceStatus) error {
	mc.presenceMu.Lock()
	defer mc.presenceMu.Unlock()

	now := time.Now()

	// Update or create presence entry
	if existing, ok := mc.userPresence[userID]; ok {
		existing.Status = status
		existing.LastSeen = now
		if existing.Timer != nil {
			existing.Timer.Stop()
			existing.Timer = nil
		}
	} else {
		mc.userPresence[userID] = &UserPresence{
			UserID:   userID,
			Status:   status,
			LastSeen: now,
		}
	}

	// Broadcast presence update
	var lastSeen *time.Time
	if status != PresenceOnline {
		lastSeen = &now
	}

	payload := PresencePayload{
		UserID:   userID,
		Status:   status,
		LastSeen: lastSeen,
	}

	msg, err := NewMessageWithChannel("presence", payload, "presence")
	if err != nil {
		mc.logger.Error("Failed to create presence message", zap.Error(err))
		return err
	}

	mc.manager.BroadcastToChannel("presence", msg)
	mc.logger.Debug("User status updated",
		zap.String("userID", userID),
		zap.String("status", string(status)))

	return nil
}

// GetUserPresence returns a user's current presence status
func (mc *MessagingChannel) GetUserPresence(userID string) (*UserPresence, bool) {
	mc.presenceMu.RLock()
	defer mc.presenceMu.RUnlock()

	presence, ok := mc.userPresence[userID]
	return presence, ok
}

// GetOnlineUsers returns all users currently online
func (mc *MessagingChannel) GetOnlineUsers() []string {
	mc.presenceMu.RLock()
	defer mc.presenceMu.RUnlock()

	var users []string
	for userID, presence := range mc.userPresence {
		if presence.Status == PresenceOnline {
			users = append(users, userID)
		}
	}
	return users
}

// BroadcastPresenceToFollowers broadcasts presence update to user's followers
func (mc *MessagingChannel) BroadcastPresenceToFollowers(userID string, followerIDs []string, status PresenceStatus) error {
	now := time.Time{}
	if status != PresenceOnline {
		t := time.Now()
		now = t
	}

	payload := PresencePayload{
		UserID:   userID,
		Status:   status,
		LastSeen: &now,
	}

	msg, err := NewMessageWithChannel("presence", payload, "presence")
	if err != nil {
		return err
	}

	// Broadcast to each follower's presence channel
	for _, followerID := range followerIDs {
		followerChannel := "presence:" + followerID
		mc.manager.BroadcastToChannel(followerChannel, msg)
	}

	mc.logger.Debug("Presence broadcast to followers",
		zap.String("userID", userID),
		zap.Int("followerCount", len(followerIDs)),
		zap.String("status", string(status)))

	return nil
}

// CancelOfflineTimer cancels the offline debounce timer (called on reconnect)
func (mc *MessagingChannel) CancelOfflineTimer(userID string) {
	mc.presenceMu.Lock()
	defer mc.presenceMu.Unlock()

	if existing, ok := mc.userPresence[userID]; ok {
		if existing.Timer != nil {
			existing.Timer.Stop()
			existing.Timer = nil
		}
	}
}
