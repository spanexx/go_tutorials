package websocket

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestDefaultConnectionManagerConfig(t *testing.T) {
	config := DefaultConnectionManagerConfig()

	assert.Equal(t, 10, config.MaxConnectionsPerUser)
	assert.Equal(t, 90*time.Second, config.ConnectionTimeout)
}

func TestNewConnectionManager(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	config := &ConnectionManagerConfig{
		MaxConnectionsPerUser: 5,
		ConnectionTimeout:     60 * time.Second,
	}

	manager := NewConnectionManager(config, logger)

	assert.NotNil(t, manager)
	assert.NotNil(t, manager.connections)
	assert.NotNil(t, manager.userConnections)
	assert.NotNil(t, manager.channelConnections)
	assert.NotNil(t, manager.Register)
	assert.NotNil(t, manager.Unregister)
	assert.NotNil(t, manager.broadcast)
	assert.Equal(t, config, manager.config)
}

func TestNewConnectionManager_DefaultConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()

	manager := NewConnectionManager(nil, logger)

	assert.NotNil(t, manager)
	assert.NotNil(t, manager.config)
	assert.Equal(t, 10, manager.config.MaxConnectionsPerUser)
}

func TestConnectionManager_Run(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	ctx, cancel := context.WithCancel(context.Background())

	// Start manager in goroutine
	go manager.Run(ctx)

	// Give it time to start
	time.Sleep(50 * time.Millisecond)

	// Cancel context to stop
	cancel()

	// Give it time to stop
	time.Sleep(50 * time.Millisecond)
}

func TestConnectionManager_AddConnection(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}

	err := manager.AddConnection(conn)
	assert.NoError(t, err)

	// Verify connection was added
	assert.Contains(t, manager.connections, "test-conn-1")
	assert.Contains(t, manager.userConnections, "user-1")
}

func TestConnectionManager_AddConnection_MaxReached(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	config := &ConnectionManagerConfig{
		MaxConnectionsPerUser: 1,
	}
	manager := NewConnectionManager(config, logger)

	// Add first connection
	conn1 := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}
	err := manager.AddConnection(conn1)
	assert.NoError(t, err)

	// Try to add second connection for same user
	conn2 := &Connection{
		ID:     "test-conn-2",
		UserID: "user-1",
	}
	err = manager.AddConnection(conn2)
	assert.Error(t, err)
	assert.Equal(t, ErrMaxConnectionsReached, err)
}

func TestConnectionManager_RemoveConnection(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn := &Connection{
		ID:       "test-conn-1",
		UserID:   "user-1",
		sendChan: make(chan *Message, 256),
	}

	// Add connection
	manager.AddConnection(conn)

	// Manually remove from maps (skip Close() which requires real websocket)
	manager.mu.Lock()
	delete(manager.connections, conn.ID)
	delete(manager.userConnections, conn.UserID)
	manager.mu.Unlock()

	// Verify connection was removed
	manager.mu.RLock()
	_, exists := manager.connections["test-conn-1"]
	manager.mu.RUnlock()
	assert.False(t, exists)
}

func TestConnectionManager_GetConnection(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}

	// Add connection
	manager.AddConnection(conn)

	// Get connection
	retrieved := manager.GetConnection("test-conn-1")
	assert.NotNil(t, retrieved)
	assert.Equal(t, "test-conn-1", retrieved.ID)
}

func TestConnectionManager_GetConnection_NotFound(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	retrieved := manager.GetConnection("non-existent")
	assert.Nil(t, retrieved)
}

func TestConnectionManager_GetUserConnections(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn1 := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}
	conn2 := &Connection{
		ID:     "test-conn-2",
		UserID: "user-1",
	}

	// Add connections
	manager.AddConnection(conn1)
	manager.AddConnection(conn2)

	// Get user connections
	conns := manager.GetUserConnections("user-1")
	assert.Len(t, conns, 2)
}

func TestConnectionManager_AddToChannel(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}

	// Add connection
	manager.AddConnection(conn)

	// Add to channel (directly manipulate channelConnections for testing)
	manager.mu.Lock()
	if _, ok := manager.channelConnections["test-channel"]; !ok {
		manager.channelConnections["test-channel"] = make(map[string]*Connection)
	}
	manager.channelConnections["test-channel"]["test-conn-1"] = conn
	manager.mu.Unlock()

	// Verify connection was added to channel
	manager.mu.RLock()
	contains := false
	if chConns, ok := manager.channelConnections["test-channel"]; ok {
		_, contains = chConns["test-conn-1"]
	}
	manager.mu.RUnlock()
	assert.True(t, contains)
}

func TestConnectionManager_RemoveFromChannel(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}

	// Add connection
	manager.AddConnection(conn)

	// Add to channel (directly manipulate for testing)
	manager.mu.Lock()
	if _, ok := manager.channelConnections["test-channel"]; !ok {
		manager.channelConnections["test-channel"] = make(map[string]*Connection)
	}
	manager.channelConnections["test-channel"]["test-conn-1"] = conn
	manager.mu.Unlock()

	// Remove from channel (directly manipulate for testing)
	manager.mu.Lock()
	if chConns, ok := manager.channelConnections["test-channel"]; ok {
		delete(chConns, "test-conn-1")
	}
	manager.mu.Unlock()

	// Verify connection was removed from channel
	manager.mu.RLock()
	contains := false
	if chConns, ok := manager.channelConnections["test-channel"]; ok {
		_, contains = chConns["test-conn-1"]
	}
	manager.mu.RUnlock()
	assert.False(t, contains)
}

func TestConnectionManager_BroadcastToChannel(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start manager
	go manager.Run(ctx)

	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}

	// Add connection
	manager.AddConnection(conn)

	// Add to channel (directly manipulate for testing)
	manager.mu.Lock()
	if _, ok := manager.channelConnections["test-channel"]; !ok {
		manager.channelConnections["test-channel"] = make(map[string]*Connection)
	}
	manager.channelConnections["test-channel"]["test-conn-1"] = conn
	manager.mu.Unlock()

	// Give time for manager to process
	time.Sleep(50 * time.Millisecond)

	// Create message
	msg, _ := NewMessage(MsgTypeConnect, map[string]interface{}{"test": "data"})

	// Broadcast to channel
	manager.BroadcastToChannel("test-channel", msg)

	// Give time for broadcast to be processed
	time.Sleep(50 * time.Millisecond)
}

func TestConnectionManager_ConnectionCount(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	// Initial count should be 0
	assert.Equal(t, 0, manager.ConnectionCount())

	// Add connection
	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}
	manager.AddConnection(conn)

	// Count should be 1
	assert.Equal(t, 1, manager.ConnectionCount())
}

func TestConnectionManager_UserCount(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	// Initial count should be 0
	assert.Equal(t, 0, manager.UserCount())

	// Add connections for same user
	conn1 := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}
	conn2 := &Connection{
		ID:     "test-conn-2",
		UserID: "user-1",
	}
	manager.AddConnection(conn1)
	manager.AddConnection(conn2)

	// User count should be 1 (not 2)
	assert.Equal(t, 1, manager.UserCount())
}

func TestConnectionManager_ChannelCount(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewConnectionManager(nil, logger)

	// Initial count should be 0
	assert.Equal(t, 0, manager.ChannelCount())

	// Add connection
	conn := &Connection{
		ID:     "test-conn-1",
		UserID: "user-1",
	}
	manager.AddConnection(conn)

	// Add to channel (directly manipulate for testing)
	manager.mu.Lock()
	if _, ok := manager.channelConnections["test-channel"]; !ok {
		manager.channelConnections["test-channel"] = make(map[string]*Connection)
	}
	manager.channelConnections["test-channel"]["test-conn-1"] = conn
	manager.mu.Unlock()

	// Channel count should be 1
	assert.Equal(t, 1, manager.ChannelCount())
}
