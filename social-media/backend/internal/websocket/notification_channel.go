package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// NotificationChannel manages real-time notification delivery
type NotificationChannel struct {
	manager      *ConnectionManager
	redisClient  *redis.Client
	logger       *zap.Logger
	batchSize    int
	batchTimeout time.Duration
	batchMu      sync.Mutex
	pendingBatch map[string][]*NotificationPayload
	batchTimers  map[string]*time.Timer
}

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeLike    NotificationType = "like"
	NotificationTypeComment NotificationType = "comment"
	NotificationTypeFollow  NotificationType = "follow"
	NotificationTypeMention NotificationType = "mention"
	NotificationTypeReply   NotificationType = "reply"
)

// NewNotificationChannel creates a new notification channel manager
func NewNotificationChannel(
	manager *ConnectionManager,
	redisClient *redis.Client,
	logger *zap.Logger,
) *NotificationChannel {
	if logger == nil {
		logger = zap.NewNop()
	}

	nc := &NotificationChannel{
		manager:      manager,
		redisClient:  redisClient,
		logger:       logger,
		batchSize:    10,
		batchTimeout: 5 * time.Second,
		pendingBatch: make(map[string][]*NotificationPayload),
		batchTimers:  make(map[string]*time.Timer),
	}

	// Start batch processor
	go nc.processBatches(context.Background())

	return nc
}

// Subscribe subscribes a user to their personal notification channel
func (nc *NotificationChannel) Subscribe(userID string, connID string) {
	channelID := nc.getNotificationChannelID(userID)
	nc.manager.AddConnectionToChannel(connID, channelID)
	nc.logger.Debug("User subscribed to notification channel",
		zap.String("userID", userID),
		zap.String("channelID", channelID))
}

// Unsubscribe unsubscribes a user from their personal notification channel
func (nc *NotificationChannel) Unsubscribe(userID string, connID string) {
	channelID := nc.getNotificationChannelID(userID)
	nc.manager.RemoveConnectionFromChannel(connID, channelID)
	nc.logger.Debug("User unsubscribed from notification channel",
		zap.String("userID", userID),
		zap.String("channelID", channelID))
}

// PushNotification sends a notification to a user in real-time
func (nc *NotificationChannel) PushNotification(userID string, notification *NotificationPayload) error {
	notification.ID = uuid.New().String()
	notification.CreatedAt = time.Now().UTC()

	// Check if we should batch this notification
	nc.batchMu.Lock()
	pending := nc.pendingBatch[userID]
	pending = append(pending, notification)
	nc.pendingBatch[userID] = pending

	// If batch is full, send immediately
	if len(pending) >= nc.batchSize {
		nc.batchMu.Unlock()
		return nc.sendBatch(userID, pending)
	}

	// Start or reset batch timer
	if timer, ok := nc.batchTimers[userID]; ok {
		timer.Reset(nc.batchTimeout)
	} else {
		nc.batchTimers[userID] = time.AfterFunc(nc.batchTimeout, func() {
			nc.sendBatchTimeout(userID)
		})
	}
	nc.batchMu.Unlock()

	return nil
}

// sendBatchTimeout sends batch when timeout occurs
func (nc *NotificationChannel) sendBatchTimeout(userID string) {
	nc.batchMu.Lock()
	defer nc.batchMu.Unlock()

	pending := nc.pendingBatch[userID]
	if len(pending) > 0 {
		nc.pendingBatch[userID] = nil
		delete(nc.batchTimers, userID)
		nc.sendBatch(userID, pending)
	}
}

// processBatches periodically processes pending batches
func (nc *NotificationChannel) processBatches(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			nc.flushOldBatches()
		}
	}
}

// flushOldBatches flushes batches that are older than timeout
func (nc *NotificationChannel) flushOldBatches() {
	nc.batchMu.Lock()
	defer nc.batchMu.Unlock()

	for userID, pending := range nc.pendingBatch {
		if len(pending) > 0 {
			nc.pendingBatch[userID] = nil
			delete(nc.batchTimers, userID)
			go nc.sendBatch(userID, pending)
		}
	}
}

// sendBatch sends a batch of notifications to a user
func (nc *NotificationChannel) sendBatch(userID string, notifications []*NotificationPayload) error {
	if len(notifications) == 0 {
		return nil
	}

	// If single notification, send directly
	if len(notifications) == 1 {
		return nc.sendNotification(userID, notifications[0])
	}

	// Send as batch
	batchMsg := &BatchNotificationPayload{
		Type:          "notification_batch",
		Notifications: notifications,
		Count:         len(notifications),
		Timestamp:     time.Now().UTC(),
	}

	msg, err := NewMessageWithChannel("notification", batchMsg, nc.getNotificationChannelID(userID))
	if err != nil {
		nc.logger.Error("Failed to create batch notification message", zap.Error(err))
		return err
	}

	nc.manager.BroadcastToUser(userID, msg)
	nc.logger.Debug("Batch notification sent",
		zap.String("userID", userID),
		zap.Int("count", len(notifications)))

	return nil
}

// sendNotification sends a single notification to a user
func (nc *NotificationChannel) sendNotification(userID string, notification *NotificationPayload) error {
	msg, err := NewMessageWithChannel("notification", notification, nc.getNotificationChannelID(userID))
	if err != nil {
		nc.logger.Error("Failed to create notification message", zap.Error(err))
		return err
	}

	nc.manager.BroadcastToUser(userID, msg)
	nc.logger.Debug("Notification sent",
		zap.String("userID", userID),
		zap.String("notificationID", notification.ID),
		zap.String("type", notification.Type))

	return nil
}

// GetUnreadCount returns the unread notification count for a user
func (nc *NotificationChannel) GetUnreadCount(userID string) (int, error) {
	if nc.redisClient == nil {
		return 0, nil
	}

	key := nc.getUnreadCountKey(userID)
	count, err := nc.redisClient.Get(context.Background(), key).Int()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}

	return count, nil
}

// IncrementUnreadCount increments the unread count for a user
func (nc *NotificationChannel) IncrementUnreadCount(userID string) (int, error) {
	if nc.redisClient == nil {
		return 0, nil
	}

	key := nc.getUnreadCountKey(userID)
	newCount, err := nc.redisClient.Incr(context.Background(), key).Result()
	if err != nil {
		return 0, err
	}

	// Set expiry to 7 days
	nc.redisClient.Expire(context.Background(), key, 7*24*time.Hour)

	// Broadcast updated count
	nc.broadcastUnreadCount(userID, int(newCount))

	return int(newCount), nil
}

// MarkAsRead marks notifications as read and resets unread count
func (nc *NotificationChannel) MarkAsRead(userID string, notificationIDs []string) error {
	if nc.redisClient != nil {
		key := nc.getUnreadCountKey(userID)
		nc.redisClient.Set(context.Background(), key, 0, 7*24*time.Hour)
	}

	// Broadcast updated count (0)
	nc.broadcastUnreadCount(userID, 0)

	nc.logger.Debug("Notifications marked as read",
		zap.String("userID", userID),
		zap.Int("count", len(notificationIDs)))

	return nil
}

// broadcastUnreadCount broadcasts the updated unread count to the user
func (nc *NotificationChannel) broadcastUnreadCount(userID string, count int) {
	payload := map[string]interface{}{
		"type":  "unread_count",
		"count": count,
	}

	msg, err := NewMessageWithChannel("notification", payload, nc.getNotificationChannelID(userID))
	if err != nil {
		nc.logger.Error("Failed to create unread count message", zap.Error(err))
		return
	}

	nc.manager.BroadcastToUser(userID, msg)
}

// getNotificationChannelID returns the channel ID for a user's notifications
func (nc *NotificationChannel) getNotificationChannelID(userID string) string {
	return "notifications:" + userID
}

// getUnreadCountKey returns the Redis key for unread count
func (nc *NotificationChannel) getUnreadCountKey(userID string) string {
	return "notifications:unread:" + userID
}

// BatchNotificationPayload represents a batch of notifications
type BatchNotificationPayload struct {
	Type          string                 `json:"type"`
	Notifications []*NotificationPayload `json:"notifications"`
	Count         int                    `json:"count"`
	Timestamp     time.Time              `json:"timestamp"`
}

// CreateLikeNotification creates a like notification payload
func CreateLikeNotification(userID, actorID, actorName, postID string) *NotificationPayload {
	return &NotificationPayload{
		Type:      string(NotificationTypeLike),
		Message:   actorName + " liked your post",
		UserID:    userID,
		ActorID:   actorID,
		ActorName: actorName,
		PostID:    &postID,
	}
}

// CreateCommentNotification creates a comment notification payload
func CreateCommentNotification(userID, actorID, actorName, postID string) *NotificationPayload {
	return &NotificationPayload{
		Type:      string(NotificationTypeComment),
		Message:   actorName + " commented on your post",
		UserID:    userID,
		ActorID:   actorID,
		ActorName: actorName,
		PostID:    &postID,
	}
}

// CreateFollowNotification creates a follow notification payload
func CreateFollowNotification(userID, actorID, actorName string) *NotificationPayload {
	return &NotificationPayload{
		Type:      string(NotificationTypeFollow),
		Message:   actorName + " started following you",
		UserID:    userID,
		ActorID:   actorID,
		ActorName: actorName,
	}
}

// CreateMentionNotification creates a mention notification payload
func CreateMentionNotification(userID, actorID, actorName, postID string) *NotificationPayload {
	return &NotificationPayload{
		Type:      string(NotificationTypeMention),
		Message:   actorName + " mentioned you",
		UserID:    userID,
		ActorID:   actorID,
		ActorName: actorName,
		PostID:    &postID,
	}
}

// MarshalJSON implements json.Marshaler for NotificationPayload
func (n *NotificationPayload) MarshalJSON() ([]byte, error) {
	type Alias NotificationPayload
	return json.Marshal(&struct {
		*Alias
		CreatedAt string `json:"created_at"`
	}{
		Alias:     (*Alias)(n),
		CreatedAt: n.CreatedAt.Format(time.RFC3339),
	})
}
