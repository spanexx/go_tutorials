package websocket

import (
	"time"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// MarkAsRead marks messages as read
func (mc *MessagingChannel) MarkAsRead(conversationID, userID string, messageIDs []string) error {
	if len(messageIDs) == 0 {
		return nil
	}

	// Check if user has disabled read receipts
	mc.readReceiptMu.RLock()
	disabled := mc.disabledReadReceipts[userID]
	mc.readReceiptMu.RUnlock()

	if disabled {
		mc.logger.Debug("Read receipts disabled for user", zap.String("userID", userID))
		return nil
	}

	now := time.Now().UTC()

	// Update in database
	if mc.db != nil {
		query := `
			UPDATE messages
			SET is_read = TRUE, read_at = $1
			WHERE id = ANY($2) AND sender_id != $3
		`
		_, err := mc.db.Exec(query, now, pq.Array(messageIDs), userID)
		if err != nil {
			mc.logger.Error("Failed to mark messages as read", zap.Error(err))
			return err
		}
	}

	// Broadcast read receipt
	receipt := ReadReceiptPayload{
		ConversationID: conversationID,
		MessageIDs:     messageIDs,
		ReadAt:         now.Format(time.RFC3339),
	}

	channelID := mc.getConversationChannelID(conversationID)
	msg, err := NewMessageWithChannel("read_receipt", receipt, channelID)
	if err != nil {
		mc.logger.Error("Failed to create read receipt", zap.Error(err))
		return err
	}

	mc.manager.BroadcastToChannel(channelID, msg)
	mc.logger.Debug("Messages marked as read",
		zap.String("conversationID", conversationID),
		zap.Int("count", len(messageIDs)))

	return nil
}

// SetReadReceiptsEnabled enables or disables read receipts for a user
func (mc *MessagingChannel) SetReadReceiptsEnabled(userID string, enabled bool) {
	mc.readReceiptMu.Lock()
	defer mc.readReceiptMu.Unlock()

	if enabled {
		delete(mc.disabledReadReceipts, userID)
	} else {
		mc.disabledReadReceipts[userID] = true
	}

	mc.logger.Debug("Read receipts setting updated",
		zap.String("userID", userID),
		zap.Bool("enabled", enabled))
}

// AreReadReceiptsEnabled returns whether read receipts are enabled for a user
func (mc *MessagingChannel) AreReadReceiptsEnabled(userID string) bool {
	mc.readReceiptMu.RLock()
	defer mc.readReceiptMu.RUnlock()
	return !mc.disabledReadReceipts[userID]
}

// GetUnreadCount returns the unread message count for a user in a conversation
func (mc *MessagingChannel) GetUnreadCount(conversationID, userID string) (int, error) {
	if mc.db == nil {
		return 0, nil
	}

	query := `
		SELECT COUNT(*)
		FROM messages
		WHERE conversation_id = $1
		  AND sender_id != $2
		  AND is_read = FALSE
		  AND deleted_at IS NULL
	`

	var count int
	err := mc.db.QueryRow(query, conversationID, userID).Scan(&count)
	return count, err
}
