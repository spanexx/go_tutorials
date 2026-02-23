package websocket

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Errors
var (
	ErrChannelFull     = errors.New("connection channel is full")
	ErrConnectionNotFound = errors.New("connection not found")
	ErrInvalidMessage  = errors.New("invalid message format")
)

// generateConnectionID generates a unique connection ID
func generateConnectionID() string {
	return fmt.Sprintf("conn_%s", uuid.New().String())
}

// FormatTime formats time for JSON responses
func FormatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

// IsChannelFull checks if a channel is full
func IsChannelFull(ch chan *Message) bool {
	return len(ch) >= cap(ch)
}
