package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// PollingService manages HTTP polling fallback
type PollingService struct {
	redisClient *redis.Client
	logger      *zap.Logger
	mu          sync.RWMutex
	events      map[string][]*PollEvent // userID -> events
	maxEvents   int
}

// PollEvent represents a polled event
type PollEvent struct {
	ID        int64       `json:"id"`
	Type      string      `json:"type"`
	Channel   string      `json:"channel"`
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

// PollRequest represents a polling request
type PollRequest struct {
	LastPollID int64 `json:"last_poll_id"`
	UserID     string `json:"user_id"`
}

// PollResponse represents a polling response
type PollResponse struct {
	Events     []*PollEvent `json:"events"`
	LastPollID int64        `json:"last_poll_id"`
	HasMore    bool         `json:"has_more"`
}

// NewPollingService creates a new polling service
func NewPollingService(redisClient *redis.Client, logger *zap.Logger) *PollingService {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &PollingService{
		redisClient: redisClient,
		logger:      logger,
		events:      make(map[string][]*PollEvent),
		maxEvents:   100,
	}
}

// StoreEvent stores an event for a user
func (ps *PollingService) StoreEvent(userID, channel, eventType string, payload interface{}) int64 {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	eventID := time.Now().UnixNano()
	event := &PollEvent{
		ID:        eventID,
		Type:      eventType,
		Channel:   channel,
		Payload:   payload,
		Timestamp: time.Now(),
	}

	// Initialize user events if needed
	if _, ok := ps.events[userID]; !ok {
		ps.events[userID] = make([]*PollEvent, 0)
	}

	// Add event
	ps.events[userID] = append(ps.events[userID], event)

	// Enforce max events
	if len(ps.events[userID]) > ps.maxEvents {
		ps.events[userID] = ps.events[userID][len(ps.events[userID])-ps.maxEvents:]
	}

	// Store in Redis for distributed systems
	if ps.redisClient != nil {
		key := "poll_events:" + userID
		eventData, _ := json.Marshal(event)
		ps.redisClient.LPush(context.Background(), key, eventData)
		ps.redisClient.LTrim(context.Background(), key, 0, int64(ps.maxEvents-1))
		ps.redisClient.Expire(context.Background(), key, 1*time.Hour)
	}

	ps.logger.Debug("Event stored for polling",
		zap.String("userID", userID),
		zap.Int64("eventID", eventID),
		zap.String("type", eventType))

	return eventID
}

// GetEvents retrieves events for a user since lastPollID
func (ps *PollingService) GetEvents(userID string, lastPollID int64, timeout time.Duration) *PollResponse {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Check for new events periodically
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			// Timeout - return empty response
			return &PollResponse{
				Events:     make([]*PollEvent, 0),
				LastPollID: lastPollID,
				HasMore:    false,
			}
		case <-ticker.C:
			ps.mu.RLock()
			events, ok := ps.events[userID]
			ps.mu.RUnlock()

			if !ok || len(events) == 0 {
				continue
			}

			// Filter events newer than lastPollID
			var newEvents []*PollEvent
			var maxID int64 = lastPollID

			for _, event := range events {
				if event.ID > lastPollID {
					newEvents = append(newEvents, event)
					if event.ID > maxID {
						maxID = event.ID
					}
				}
			}

			if len(newEvents) > 0 {
				return &PollResponse{
					Events:     newEvents,
					LastPollID: maxID,
					HasMore:    len(newEvents) >= 10, // Indicate if there might be more
				}
			}
		}
	}
}

// GetEventsFromRedis retrieves events from Redis storage
func (ps *PollingService) GetEventsFromRedis(userID string, lastPollID int64) ([]*PollEvent, error) {
	if ps.redisClient == nil {
		return nil, nil
	}

	key := "poll_events:" + userID
	result, err := ps.redisClient.LRange(context.Background(), key, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	var events []*PollEvent
	for _, data := range result {
		var event PollEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			ps.logger.Error("Failed to unmarshal poll event", zap.Error(err))
			continue
		}
		if event.ID > lastPollID {
			events = append(events, &event)
		}
	}

	return events, nil
}

// ClearUserEvents clears all events for a user
func (ps *PollingService) ClearUserEvents(userID string) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	delete(ps.events, userID)

	if ps.redisClient != nil {
		key := "poll_events:" + userID
		ps.redisClient.Del(context.Background(), key)
	}

	ps.logger.Debug("User events cleared", zap.String("userID", userID))
}

// RegisterPollingRoutes registers HTTP polling routes with Gin
func (ps *PollingService) RegisterPollingRoutes(router *gin.Engine) {
	router.GET("/api/v1/realtime/poll", ps.handlePoll)
	router.POST("/api/v1/realtime/poll", ps.handlePollPost)
}

// handlePoll handles GET polling requests
func (ps *PollingService) handlePoll(c *gin.Context) {
	userID := c.Query("user_id")
	lastPollID := c.GetInt64("last_poll_id")
	timeout := c.DefaultQuery("timeout", "30")

	timeoutSec, err := time.ParseDuration(timeout + "s")
	if err != nil {
		timeoutSec = 30 * time.Second
	}

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	response := ps.GetEvents(userID, lastPollID, timeoutSec)
	c.JSON(http.StatusOK, response)
}

// handlePollPost handles POST polling requests
func (ps *PollingService) handlePollPost(c *gin.Context) {
	var req PollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	timeout := c.DefaultQuery("timeout", "30")
	timeoutSec, err := time.ParseDuration(timeout + "s")
	if err != nil {
		timeoutSec = 30 * time.Second
	}

	response := ps.GetEvents(req.UserID, req.LastPollID, timeoutSec)
	c.JSON(http.StatusOK, response)
}

// BroadcastToPollingUsers broadcasts an event to polling users
func (ps *PollingService) BroadcastToPollingUsers(userIDs []string, channel, eventType string, payload interface{}) {
	for _, userID := range userIDs {
		ps.StoreEvent(userID, channel, eventType, payload)
	}
}
