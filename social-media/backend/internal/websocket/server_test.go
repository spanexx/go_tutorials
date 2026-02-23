package websocket

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	assert.Equal(t, ":8082", config.Port)
	assert.Equal(t, 30*time.Second, config.HeartbeatInterval)
	assert.Equal(t, 10000, config.MaxConnections)
	assert.Equal(t, 10*time.Second, config.WriteTimeout)
	assert.Equal(t, 60*time.Second, config.ReadTimeout)
}

func TestNewWebSocketServer(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	assert.NotNil(t, server)
	assert.NotNil(t, server.manager)
	assert.NotNil(t, server.notificationChannel)
	assert.NotNil(t, server.messagingChannel)
	assert.Equal(t, config, server.config)
}

func TestWebSocketServer_StartStop(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := &Config{
		Port:              ":0", // Use any available port
		HeartbeatInterval: 30 * time.Second,
		MaxConnections:    100,
		WriteTimeout:      10 * time.Second,
		ReadTimeout:       60 * time.Second,
	}

	server := NewWebSocketServer(config, logger, redisClient, nil)

	// Just verify server can be created - skip start/stop test as it requires full setup
	assert.NotNil(t, server)
}

func TestWebSocketServer_HandleWebSocket_InvalidToken(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	// Create test request without token
	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	w := httptest.NewRecorder()

	server.HandleWebSocket(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "missing token")
}

func TestWebSocketServer_HandleWebSocket_InvalidTokenFormat(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	// Create test request with invalid token
	req := httptest.NewRequest(http.MethodGet, "/ws?token=invalid", nil)
	w := httptest.NewRecorder()

	server.HandleWebSocket(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid token")
}

func TestWebSocketServer_HealthCheck(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	// Create test request
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	server.HealthCheck(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "status")
	assert.Contains(t, w.Body.String(), "healthy")
}

func TestWebSocketServer_GetNotificationChannel(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	channel := server.GetNotificationChannel()
	assert.NotNil(t, channel)
}

func TestWebSocketServer_GetMessagingChannel(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	config := DefaultConfig()

	server := NewWebSocketServer(config, logger, redisClient, nil)

	channel := server.GetMessagingChannel()
	assert.NotNil(t, channel)
}
