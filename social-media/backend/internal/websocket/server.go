package websocket

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Config holds WebSocket server configuration
type Config struct {
	Port              string        `json:"port"`
	HeartbeatInterval time.Duration `json:"heartbeat_interval"`
	MaxConnections    int           `json:"max_connections"`
	WriteTimeout      time.Duration `json:"write_timeout"`
	ReadTimeout       time.Duration `json:"read_timeout"`
	JWTSecret         string        `json:"jwt_secret"`
}

// DefaultConfig returns default WebSocket server configuration
func DefaultConfig() *Config {
	return &Config{
		Port:              ":8082",
		HeartbeatInterval: 30 * time.Second,
		MaxConnections:    10000,
		WriteTimeout:      10 * time.Second,
		ReadTimeout:       60 * time.Second,
		JWTSecret:         os.Getenv("JWT_SECRET"),
	}
}

// WebSocketServer manages WebSocket connections
type WebSocketServer struct {
	upgrader            websocket.Upgrader
	config              *Config
	manager             *ConnectionManager
	notificationChannel *NotificationChannel
	messagingChannel    *MessagingChannel
	redisClient         *redis.Client
	logger              *zap.Logger
	server              *http.Server
	wg                  sync.WaitGroup
}

// NewWebSocketServer creates a new WebSocket server
func NewWebSocketServer(config *Config, logger *zap.Logger, redisClient *redis.Client, db *sql.DB) *WebSocketServer {
	manager := NewConnectionManager(nil, logger)
	notificationChannel := NewNotificationChannel(manager, redisClient, logger)
	messagingChannel := NewMessagingChannel(manager, db, redisClient, logger)
	
	return &WebSocketServer{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// Enable compression
			EnableCompression: true,
			// Allow all origins for now (configure in production)
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
			// Subprotocol negotiation
			Subprotocols: []string{"socialhub-v1"},
		},
		config:              config,
		manager:             manager,
		notificationChannel: notificationChannel,
		messagingChannel:    messagingChannel,
		redisClient:         redisClient,
		logger:              logger,
	}
}

// Start starts the WebSocket server
func (s *WebSocketServer) Start(ctx context.Context) error {
	s.logger.Info("Starting WebSocket server", zap.String("port", s.config.Port))

	// Start connection manager
	go s.manager.Run(ctx)

	// Setup HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.HandleWebSocket)
	mux.HandleFunc("/health", s.HealthCheck)

	s.server = &http.Server{
		Addr:         s.config.Port,
		Handler:      s.loggerMiddleware(mux),
		ReadTimeout:  s.config.ReadTimeout,
		WriteTimeout: s.config.WriteTimeout,
	}

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		if err := s.server.ListenAndServe(); err != http.ErrServerClosed {
			s.logger.Error("WebSocket server failed", zap.Error(err))
		}
	}()

	return nil
}

// Stop gracefully stops the WebSocket server
func (s *WebSocketServer) Stop(ctx context.Context) error {
	s.logger.Info("Stopping WebSocket server")

	// Shutdown HTTP server
	if err := s.server.Shutdown(ctx); err != nil {
		return err
	}

	// Wait for goroutines to finish
	s.wg.Wait()

	// Stop connection manager
	s.manager.Stop()

	s.logger.Info("WebSocket server stopped")
	return nil
}

// HandleWebSocket handles WebSocket upgrade requests
func (s *WebSocketServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Get token from query parameter
	token := r.URL.Query().Get("token")
	if token == "" {
		s.logger.Warn("WebSocket connection rejected: missing token")
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	// Validate JWT token and extract userID
	userID, err := s.validateToken(token)
	if err != nil {
		s.logger.Warn("WebSocket connection rejected: invalid token", zap.Error(err))
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	// Upgrade connection
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("WebSocket upgrade failed", zap.Error(err))
		return
	}

	s.logger.Info("WebSocket connection established", zap.String("userID", userID))

	// Create connection
	connection := NewConnectionWithMetadata(userID, r.UserAgent(), conn, s.logger)

	// Register connection with manager
	if err := s.manager.AddConnection(connection); err != nil {
		s.logger.Warn("Failed to add connection", zap.Error(err))
		http.Error(w, "connection limit reached", http.StatusServiceUnavailable)
		return
	}

	// Create context for this connection
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Subscribe to notification channel
	s.notificationChannel.Subscribe(userID, connection.ID)

	// Handle connection
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		connection.HandleMessages(ctx, s.manager, s.notificationChannel, s.messagingChannel)
	}()
}

// HealthCheck returns server health status
func (s *WebSocketServer) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "healthy",
		"connections": s.manager.ConnectionCount(),
		"users":       s.manager.UserCount(),
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	})
}

// validateToken validates JWT token and returns userID
func (s *WebSocketServer) validateToken(token string) (string, error) {
	// Parse and validate JWT token
	claims := &jwt.RegisteredClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil {
		return "", err
	}

	// Validate token claims
	if !parsedToken.Valid {
		return "", errors.New("invalid token")
	}

	// Check expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return "", errors.New("token expired")
	}

	// Return userID from token subject
	return claims.Subject, nil
}

// loggerMiddleware adds logging to HTTP requests
func (s *WebSocketServer) loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		s.logger.Debug("HTTP request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Duration("duration", time.Since(start)),
		)
	})
}

// BroadcastToUser sends a message to all connections of a user
func (s *WebSocketServer) BroadcastToUser(userID string, msg *Message) {
	s.manager.BroadcastToUser(userID, msg)
}

// BroadcastToChannel sends a message to all connections in a channel
func (s *WebSocketServer) BroadcastToChannel(channelID string, msg *Message) {
	s.manager.BroadcastToChannel(channelID, msg)
}

// GetConnectionCount returns the number of active connections
func (s *WebSocketServer) GetConnectionCount() int {
	return s.manager.ConnectionCount()
}

// GetNotificationChannel returns the notification channel manager
func (s *WebSocketServer) GetNotificationChannel() *NotificationChannel {
	return s.notificationChannel
}

// GetMessagingChannel returns the messaging channel manager
func (s *WebSocketServer) GetMessagingChannel() *MessagingChannel {
	return s.messagingChannel
}
