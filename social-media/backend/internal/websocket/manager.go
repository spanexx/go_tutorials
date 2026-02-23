package websocket

import (
	"context"
	"errors"
	"sync"
	"time"

	"go.uber.org/zap"
)

// ConnectionManagerConfig holds configuration for the connection manager
type ConnectionManagerConfig struct {
	MaxConnectionsPerUser int           `json:"max_connections_per_user"`
	ConnectionTimeout     time.Duration `json:"connection_timeout"`
}

// DefaultConnectionManagerConfig returns default connection manager configuration
func DefaultConnectionManagerConfig() *ConnectionManagerConfig {
	return &ConnectionManagerConfig{
		MaxConnectionsPerUser: 10,
		ConnectionTimeout:     90 * time.Second,
	}
}

// Errors
var (
	ErrMaxConnectionsReached = errors.New("maximum connections per user reached")
)

// ConnectionManager manages WebSocket connection lifecycle
type ConnectionManager struct {
	// Registered connections by ID
	connections map[string]*Connection

	// User to connections mapping (user can have multiple connections)
	userConnections map[string][]*Connection

	// Channel to connections mapping
	channelConnections map[string]map[string]*Connection

	// Register requests from connections
	Register chan *Connection

	// Unregister requests from connections
	Unregister chan *Connection

	// Broadcast messages to all connections
	broadcast chan *BroadcastMessage

	// Configuration
	config *ConnectionManagerConfig
	logger *zap.Logger

	mu sync.RWMutex
}

// NewConnectionManager creates a new connection manager
func NewConnectionManager(config *ConnectionManagerConfig, logger *zap.Logger) *ConnectionManager {
	if config == nil {
		config = DefaultConnectionManagerConfig()
	}
	if logger == nil {
		logger = zap.NewNop()
	}

	return &ConnectionManager{
		connections:        make(map[string]*Connection),
		userConnections:    make(map[string][]*Connection),
		channelConnections: make(map[string]map[string]*Connection),
		Register:           make(chan *Connection),
		Unregister:         make(chan *Connection),
		broadcast:          make(chan *BroadcastMessage, 256),
		config:             config,
		logger:             logger,
	}
}

// Run starts the connection manager's main loop
func (m *ConnectionManager) Run(ctx context.Context) {
	// Start stale connection checker
	go m.checkStaleConnections(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case conn := <-m.Register:
			m.AddConnection(conn)
		case conn := <-m.Unregister:
			m.RemoveConnection(conn)
		case msg := <-m.broadcast:
			m.handleBroadcast(msg)
		}
	}
}

// Stop stops the connection manager
func (m *ConnectionManager) Stop() {
	close(m.Register)
	close(m.Unregister)
	close(m.broadcast)
}

// AddConnection adds a connection to the manager
// Returns error if max connections per user is reached
func (m *ConnectionManager) AddConnection(conn *Connection) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check max connections per user
	if conns, ok := m.userConnections[conn.UserID]; ok {
		if len(conns) >= m.config.MaxConnectionsPerUser {
			m.logger.Warn("Max connections reached for user",
				zap.String("userID", conn.UserID),
				zap.Int("max", m.config.MaxConnectionsPerUser))
			return ErrMaxConnectionsReached
		}
	}

	m.connections[conn.ID] = conn

	// Add to user connections
	m.userConnections[conn.UserID] = append(m.userConnections[conn.UserID], conn)

	m.logger.Debug("Connection added",
		zap.String("connectionID", conn.ID),
		zap.String("userID", conn.UserID))

	return nil
}

// RemoveConnection removes a connection from the manager
func (m *ConnectionManager) RemoveConnection(conn *Connection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.connections[conn.ID]; !ok {
		return
	}

	// Remove from connections
	delete(m.connections, conn.ID)

	// Remove from user connections
	if conns, ok := m.userConnections[conn.UserID]; ok {
		for i, c := range conns {
			if c.ID == conn.ID {
				m.userConnections[conn.UserID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		if len(m.userConnections[conn.UserID]) == 0 {
			delete(m.userConnections, conn.UserID)
		}
	}

	// Remove from all channels
	for channelID, conns := range m.channelConnections {
		if _, ok := conns[conn.ID]; ok {
			delete(conns, conn.ID)
			if len(conns) == 0 {
				delete(m.channelConnections, channelID)
			}
		}
	}

	// Close connection's send channel
	conn.Close()

	m.logger.Debug("Connection removed",
		zap.String("connectionID", conn.ID),
		zap.String("userID", conn.UserID))
}

// GetConnection returns a connection by ID
func (m *ConnectionManager) GetConnection(connID string) *Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.connections[connID]
}

// GetUserConnections returns all connections for a user
func (m *ConnectionManager) GetUserConnections(userID string) []*Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.userConnections[userID]
}

// BroadcastToUser sends a message to all connections of a user
func (m *ConnectionManager) BroadcastToUser(userID string, msg *Message) {
	m.broadcast <- &BroadcastMessage{
		UserID:  userID,
		Message: msg,
	}
}

// BroadcastToChannel sends a message to all connections in a channel
func (m *ConnectionManager) BroadcastToChannel(channelID string, msg *Message) {
	m.broadcast <- &BroadcastMessage{
		ChannelID: channelID,
		Message:   msg,
	}
}

// handleBroadcast handles broadcast messages
func (m *ConnectionManager) handleBroadcast(msg *BroadcastMessage) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if msg.UserID != "" {
		// Broadcast to specific user
		if conns, ok := m.userConnections[msg.UserID]; ok {
			for _, conn := range conns {
				select {
				case conn.sendChan <- msg.Message:
				default:
					// Connection buffer full, skip
					m.logger.Debug("Connection buffer full, skipping message",
						zap.String("connectionID", conn.ID))
				}
			}
		}
	}

	if msg.ChannelID != "" {
		// Broadcast to channel
		if conns, ok := m.channelConnections[msg.ChannelID]; ok {
			for _, conn := range conns {
				select {
				case conn.sendChan <- msg.Message:
				default:
					// Connection buffer full, skip
					m.logger.Debug("Connection buffer full, skipping message",
						zap.String("connectionID", conn.ID))
				}
			}
		}
	}
}

// ConnectionCount returns the number of active connections
func (m *ConnectionManager) ConnectionCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.connections)
}

// UserCount returns the number of unique users connected
func (m *ConnectionManager) UserCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.userConnections)
}

// ChannelCount returns the number of active channels
func (m *ConnectionManager) ChannelCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.channelConnections)
}

// GetUserConnectionCount returns the number of connections for a specific user
func (m *ConnectionManager) GetUserConnectionCount(userID string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if conns, ok := m.userConnections[userID]; ok {
		return len(conns)
	}
	return 0
}

// checkStaleConnections periodically checks for and removes stale connections
func (m *ConnectionManager) checkStaleConnections(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.removeStaleConnections()
		}
	}
}

// removeStaleConnections removes connections that haven't been active recently
func (m *ConnectionManager) removeStaleConnections() {
	m.mu.RLock()
	staleConnections := make([]*Connection, 0)

	for _, conn := range m.connections {
		conn.mu.RLock()
		lastActivity := conn.LastActivity
		conn.mu.RUnlock()

		if time.Since(lastActivity) > m.config.ConnectionTimeout {
			staleConnections = append(staleConnections, conn)
		}
	}
	m.mu.RUnlock()

	// Remove stale connections
	for _, conn := range staleConnections {
		m.logger.Warn("Removing stale connection",
			zap.String("connectionID", conn.ID),
			zap.String("userID", conn.UserID),
			zap.Duration("inactive", time.Since(conn.LastActivity)))
		m.Unregister <- conn
	}
}

// AddConnectionToChannel adds a connection to a channel
func (m *ConnectionManager) AddConnectionToChannel(connID, channelID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn, ok := m.connections[connID]
	if !ok {
		return false
	}

	if _, ok := m.channelConnections[channelID]; !ok {
		m.channelConnections[channelID] = make(map[string]*Connection)
	}

	m.channelConnections[channelID][connID] = conn
	conn.JoinChannel(channelID)

	return true
}

// RemoveConnectionFromChannel removes a connection from a channel
func (m *ConnectionManager) RemoveConnectionFromChannel(connID, channelID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conns, ok := m.channelConnections[channelID]; ok {
		if conn, ok := conns[connID]; ok {
			conn.LeaveChannel(channelID)
			delete(conns, connID)
			if len(conns) == 0 {
				delete(m.channelConnections, channelID)
			}
		}
	}
}

// GetChannelConnections returns all connections in a channel
func (m *ConnectionManager) GetChannelConnections(channelID string) []*Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if conns, ok := m.channelConnections[channelID]; ok {
		result := make([]*Connection, 0, len(conns))
		for _, conn := range conns {
			result = append(result, conn)
		}
		return result
	}
	return nil
}
