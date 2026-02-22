// Package handlers implements HTTP handlers for reaction endpoints
package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/socialhub/auth-service/internal/service"
	"github.com/socialhub/auth-service/pkg/models"
)

// ReactionHandler handles HTTP requests for reaction operations
type ReactionHandler struct {
	reactionService *service.ReactionService
}

// NewReactionHandler creates a new ReactionHandler instance
func NewReactionHandler(reactionService *service.ReactionService) *ReactionHandler {
	return &ReactionHandler{
		reactionService: reactionService,
	}
}

// ReactRequest represents a request to add a reaction
type ReactRequest struct {
	Type string `json:"type" binding:"required,oneof=like love laugh wow sad angry"`
}

// ReactionResponse represents a reaction response
type ReactionResponse struct {
	Reaction *models.Reaction `json:"reaction"`
	Success  bool             `json:"success"`
	Message  string           `json:"message"`
}

// AddReaction handles POST /api/v1/posts/:id/reactions
// @Summary Add a reaction to a post
// @Description Add a reaction (like, love, laugh, wow, sad, angry) to a post
// @Tags reactions
// @Accept json
// @Produce json
// @Param id path string true "Post ID"
// @Param request body ReactRequest true "Reaction request"
// @Success 200 {object} ReactionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions [post]
func (h *ReactionHandler) AddReaction(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var req ReactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "user not authenticated",
		})
		return
	}

	// Add reaction
	reaction, err := h.reactionService.React(c.Request.Context(), service.ReactInput{
		PostID: postID,
		UserID: userID.(string),
		Type:   req.Type,
	})
	if err != nil {
		if errors.Is(err, service.ErrInvalidReactionType) {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_reaction_type",
				Message: "invalid reaction type. Valid types: like, love, laugh, wow, sad, angry",
			})
		} else if errors.Is(err, service.ErrReactionExists) {
			c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "conflict",
				Message: "you have already reacted with this type",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "add_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, ReactionResponse{
		Reaction: reaction,
		Success:  true,
		Message:  "reaction added successfully",
	})
}

// RemoveReaction handles DELETE /api/v1/posts/:id/reactions
// @Summary Remove a reaction from a post
// @Description Remove a reaction from a post (idempotent - no error if reaction doesn't exist)
// @Tags reactions
// @Produce json
// @Param id path string true "Post ID"
// @Param type query string true "Reaction type" Enums(like, love, laugh, wow, sad, angry)
// @Success 200 {object} ReactionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions [delete]
func (h *ReactionHandler) RemoveReaction(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	reactionType := c.Query("type")
	if reactionType == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_type",
			Message: "reaction type is required",
		})
		return
	}

	// Validate reaction type
	validTypes := map[string]bool{
		"like": true, "love": true, "laugh": true,
		"wow": true, "sad": true, "angry": true,
	}
	if !validTypes[reactionType] {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_reaction_type",
			Message: "invalid reaction type. Valid types: like, love, laugh, wow, sad, angry",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "user not authenticated",
		})
		return
	}

	// Remove reaction (idempotent - no error if doesn't exist)
	err := h.reactionService.RemoveReaction(c.Request.Context(), service.RemoveReactionInput{
		PostID: postID,
		UserID: userID.(string),
		Type:   reactionType,
	})
	if err != nil && !errors.Is(err, service.ErrReactionNotFound) {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "remove_failed",
			Message: err.Error(),
		})
		return
	}

	// Idempotent delete - return success even if reaction didn't exist
	c.JSON(http.StatusOK, ReactionResponse{
		Reaction: nil,
		Success:  true,
		Message:  "reaction removed successfully",
	})
}

// ToggleReaction handles POST /api/v1/posts/:id/reactions/toggle
// @Summary Toggle a reaction on a post
// @Description Toggle a reaction (add if not exists, remove if exists)
// @Tags reactions
// @Accept json
// @Produce json
// @Param id path string true "Post ID"
// @Param request body ReactRequest true "Reaction request"
// @Success 200 {object} ToggleReactionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions/toggle [post]
func (h *ReactionHandler) ToggleReaction(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var req ReactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "user not authenticated",
		})
		return
	}

	// Toggle reaction
	added, err := h.reactionService.ToggleReaction(c.Request.Context(), service.ToggleReactionInput{
		PostID: postID,
		UserID: userID.(string),
		Type:   req.Type,
	})
	if err != nil {
		if errors.Is(err, service.ErrInvalidReactionType) {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_reaction_type",
				Message: "invalid reaction type",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "toggle_failed",
				Message: err.Error(),
			})
		}
		return
	}

	message := "reaction added"
	if !added {
		message = "reaction removed"
	}

	c.JSON(http.StatusOK, ToggleReactionResponse{
		Added:   added,
		Success: true,
		Message: message,
	})
}

// ToggleReactionResponse represents a toggle reaction response
type ToggleReactionResponse struct {
	Added   bool   `json:"added"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// GetReactions handles GET /api/v1/posts/:id/reactions
// @Summary Get reactions for a post
// @Description Get all reactions for a post with counts by type
// @Tags reactions
// @Produce json
// @Param id path string true "Post ID"
// @Success 200 {object} ReactionsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions [get]
func (h *ReactionHandler) GetReactions(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	// Get reaction counts
	counts, err := h.reactionService.GetReactionCounts(c.Request.Context(), service.GetReactionCountsInput{
		PostID: postID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	// Get top reactions
	topReactions, err := h.reactionService.GetTopReactions(c.Request.Context(), postID, "", 3)
	if err != nil {
		// Non-critical error, continue with counts
		topReactions = []service.ReactionCount{}
	}

	c.JSON(http.StatusOK, ReactionsResponse{
		Counts:       counts,
		TopReactions: topReactions,
		Success:      true,
	})
}

// ReactionsResponse represents a reactions response
type ReactionsResponse struct {
	Counts       *service.ReactionCounts `json:"counts"`
	TopReactions []service.ReactionCount `json:"top_reactions"`
	Success      bool                    `json:"success"`
}

// ReactionListResponse represents a list of reactions response
type ReactionListResponse struct {
	Reactions []models.ReactionWithUser `json:"reactions"`
	Success   bool                      `json:"success"`
}

// GetUserReaction handles GET /api/v1/posts/:id/reactions/me
// @Summary Get current user's reaction to a post
// @Description Get the current user's reaction to a specific post
// @Tags reactions
// @Produce json
// @Param id path string true "Post ID"
// @Success 200 {object} UserReactionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions/me [get]
func (h *ReactionHandler) GetUserReaction(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "user not authenticated",
		})
		return
	}

	// Get user's reaction
	reaction, err := h.reactionService.GetUserReaction(c.Request.Context(), postID, "", userID.(string))
	if err != nil {
		if errors.Is(err, service.ErrReactionNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "no reaction found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "fetch_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, UserReactionResponse{
		Reaction: reaction,
		Success:  true,
	})
}

// ListReactions handles GET /api/v1/posts/:id/reactions/list
// @Summary List reactions for a post
// @Description List reactions (with user display info) for a post
// @Tags reactions
// @Produce json
// @Param id path string true "Post ID"
// @Param limit query int false "Max results" default(50)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} ReactionListResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts/{id}/reactions/list [get]
func (h *ReactionHandler) ListReactions(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	limit := int32(50)
	offset := int32(0)
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = int32(n)
		}
	}
	if o := c.Query("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = int32(n)
		}
	}

	reactions, err := h.reactionService.GetReactions(c.Request.Context(), service.GetReactionsInput{
		PostID: postID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, ReactionListResponse{
		Reactions: reactions,
		Success:   true,
	})
}

// UserReactionResponse represents a user reaction response
type UserReactionResponse struct {
	Reaction *models.Reaction `json:"reaction"`
	Success  bool             `json:"success"`
}

// RegisterReactionRoutes registers reaction routes with Gin router
func RegisterReactionRoutes(r *gin.RouterGroup, reactionService *service.ReactionService) {
	handler := NewReactionHandler(reactionService)

	reactions := r.Group("/posts/:id/reactions")
	{
		reactions.POST("", handler.AddReaction)
		reactions.DELETE("", handler.RemoveReaction)
		reactions.POST("/toggle", handler.ToggleReaction)
		reactions.GET("", handler.GetReactions)
		reactions.GET("/list", handler.ListReactions)
		reactions.GET("/me", handler.GetUserReaction)
	}
}
