package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/service"
)

type ActivityHandler struct {
	activityService *service.ActivityService
}

func NewActivityHandler(activityService *service.ActivityService) *ActivityHandler {
	return &ActivityHandler{activityService: activityService}
}

type ActivityFeedResponse struct {
	Activities []ActivityDTO `json:"activities"`
	HasMore    bool          `json:"has_more"`
	Cursor     string        `json:"cursor"`
}

type ActivityActorDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

type ActivityTargetDTO struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Title   string `json:"title,omitempty"`
}

type ActivityDTO struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Actor     ActivityActorDTO  `json:"actor"`
	Target    ActivityTargetDTO `json:"target"`
	Timestamp string            `json:"timestamp"`
	Read      bool              `json:"read"`
	Metadata  map[string]any    `json:"metadata,omitempty"`
}

func (h *ActivityHandler) GetFeed(c *gin.Context) {
	userID := c.GetString("user_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cursor := c.Query("cursor")
	typeStr := c.Query("type")
	if cursor == "undefined" {
		cursor = ""
	}
	if typeStr == "undefined" {
		typeStr = ""
	}

	var t service.ActivityType
	if typeStr != "" {
		t = service.ActivityType(typeStr)
	}

	items, nextCursor, hasMore, err := h.activityService.ListFeed(c.Request.Context(), service.ListFeedInput{
		UserID: userID,
		Limit:  limit,
		Cursor: cursor,
		Type:   t,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch_failed", Message: err.Error()})
		return
	}

	dtos := make([]ActivityDTO, 0, len(items))
	for _, it := range items {
		dtos = append(dtos, ActivityDTO{
			ID:   it.ID,
			Type: string(it.Type),
			Actor: ActivityActorDTO{
				ID:       it.ActorID,
				Name:     it.ActorName,
				Username: it.ActorUsername,
				Avatar:   it.ActorAvatar,
			},
			Target: ActivityTargetDTO{
				ID:      it.TargetID,
				Type:    it.TargetType,
				Content: it.Content,
			},
			Timestamp: it.CreatedAt.Format(time.RFC3339Nano),
			Read:      it.ReadAt != nil,
			Metadata:  it.Metadata,
		})
	}

	c.JSON(http.StatusOK, ActivityFeedResponse{
		Activities: dtos,
		HasMore:    hasMore,
		Cursor:     nextCursor,
	})
}

type CreateActivityRequest struct {
	Type         string         `json:"type" binding:"required"`
	TargetUserID string         `json:"target_user_id" binding:"required"`
	TargetID     string         `json:"target_id" binding:"required"`
	TargetType   string         `json:"target_type" binding:"required"`
	Content      string         `json:"content"`
	Metadata     map[string]any `json:"metadata"`
}

func (h *ActivityHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_request", Message: err.Error()})
		return
	}

	created, err := h.activityService.CreateActivity(c.Request.Context(), service.CreateActivityInput{
		Type:         service.ActivityType(req.Type),
		ActorID:      userID,
		TargetUserID: req.TargetUserID,
		TargetID:     req.TargetID,
		TargetType:   req.TargetType,
		Content:      req.Content,
		Metadata:     req.Metadata,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "create_failed", Message: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *ActivityHandler) MarkAsRead(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")
	if err := h.activityService.MarkAsRead(c.Request.Context(), userID, id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "mark_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *ActivityHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.GetString("user_id")
	if err := h.activityService.MarkAllAsRead(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "mark_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
