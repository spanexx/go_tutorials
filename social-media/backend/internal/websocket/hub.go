package websocket

import (
	"context"
	"sync"
)

// Hub manages WebSocket connections and channels
type Hub struct {
	// Registered connections
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

	mu sync.RWMutex
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	UserID    string
	ChannelID string
	Message   *Message
}

// NewHub creates a new connection hub
func NewHub() *Hub {
	return &Hub{
		connections:        make(map[string]*Connection),
		userConnections:    make(map[string][]*Connection),
		channelConnections: make(map[string]map[string]*Connection),
		Register:           make(chan *Connection),
		Unregister:         make(chan *Connection),
		broadcast:          make(chan *BroadcastMessage, 256),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case conn := <-h.Register:
			h.addConnection(conn)
		case conn := <-h.Unregister:
			h.removeConnection(conn)
		case msg := <-h.broadcast:
			h.handleBroadcast(msg)
		}
	}
}

// Stop stops the hub
func (h *Hub) Stop() {
	close(h.Register)
	close(h.Unregister)
	close(h.broadcast)
}

// addConnection adds a connection to the hub
func (h *Hub) addConnection(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.connections[conn.ID] = conn

	// Add to user connections
	h.userConnections[conn.UserID] = append(h.userConnections[conn.UserID], conn)
}

// removeConnection removes a connection from the hub
func (h *Hub) removeConnection(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.connections[conn.ID]; !ok {
		return
	}

	// Remove from connections
	delete(h.connections, conn.ID)

	// Remove from user connections
	if conns, ok := h.userConnections[conn.UserID]; ok {
		for i, c := range conns {
			if c.ID == conn.ID {
				h.userConnections[conn.UserID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		if len(h.userConnections[conn.UserID]) == 0 {
			delete(h.userConnections, conn.UserID)
		}
	}

	// Remove from all channels
	for channelID, conns := range h.channelConnections {
		if _, ok := conns[conn.ID]; ok {
			delete(conns, conn.ID)
			if len(conns) == 0 {
				delete(h.channelConnections, channelID)
			}
		}
	}

	// Close connection's send channel
	conn.Close()
}

// handleBroadcast handles broadcast messages
func (h *Hub) handleBroadcast(msg *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if msg.UserID != "" {
		// Broadcast to specific user
		if conns, ok := h.userConnections[msg.UserID]; ok {
			for _, conn := range conns {
				select {
				case conn.sendChan <- msg.Message:
				default:
					// Connection buffer full, skip
				}
			}
		}
	}

	if msg.ChannelID != "" {
		// Broadcast to channel
		if conns, ok := h.channelConnections[msg.ChannelID]; ok {
			for _, conn := range conns {
				select {
				case conn.sendChan <- msg.Message:
				default:
					// Connection buffer full, skip
				}
			}
		}
	}
}

// BroadcastToUser sends a message to all connections of a user
func (h *Hub) BroadcastToUser(userID string, msg *Message) {
	h.broadcast <- &BroadcastMessage{
		UserID:  userID,
		Message: msg,
	}
}

// BroadcastToChannel sends a message to all connections in a channel
func (h *Hub) BroadcastToChannel(channelID string, msg *Message) {
	h.broadcast <- &BroadcastMessage{
		ChannelID: channelID,
		Message:   msg,
	}
}

// GetConnection returns a connection by ID
func (h *Hub) GetConnection(connID string) *Connection {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.connections[connID]
}

// GetUserConnections returns all connections for a user
func (h *Hub) GetUserConnections(userID string) []*Connection {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.userConnections[userID]
}

// ConnectionCount returns the number of active connections
func (h *Hub) ConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.connections)
}

// UserCount returns the number of unique users connected
func (h *Hub) UserCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.userConnections)
}

// ChannelCount returns the number of active channels
func (h *Hub) ChannelCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.channelConnections)
}
