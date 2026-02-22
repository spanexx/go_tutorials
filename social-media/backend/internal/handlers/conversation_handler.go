package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ConversationHandler struct{}

func NewConversationHandler() *ConversationHandler {
	return &ConversationHandler{}
}

type ConversationDTO struct {
	ID          string `json:"id"`
	UpdatedAt   string `json:"updated_at"`
	UnreadCount int    `json:"unread_count"`
}

type ConversationsResponse struct {
	Conversations []ConversationDTO `json:"conversations"`
	TotalCount    int              `json:"total_count"`
	HasMore       bool             `json:"has_more"`
	Page          int              `json:"page"`
	Limit         int              `json:"limit"`
}

type MessageDTO struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type MessagesResponse struct {
	Messages    []MessageDTO `json:"messages"`
	TotalCount  int          `json:"total_count"`
	HasMore     bool         `json:"has_more"`
	Page        int          `json:"page"`
	Limit       int          `json:"limit"`
}

func (h *ConversationHandler) ListConversations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	c.JSON(http.StatusOK, ConversationsResponse{
		Conversations: []ConversationDTO{},
		TotalCount:    0,
		HasMore:       false,
		Page:          page,
		Limit:         limit,
	})
}

func (h *ConversationHandler) ListMessages(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 50
	}
	c.JSON(http.StatusOK, MessagesResponse{
		Messages:    []MessageDTO{},
		TotalCount:  0,
		HasMore:     false,
		Page:        page,
		Limit:       limit,
	})
}
