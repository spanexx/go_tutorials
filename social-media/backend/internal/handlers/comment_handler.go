// Package handlers implements HTTP handlers for comment endpoints
package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/socialhub/auth-service/internal/service"
	"github.com/socialhub/auth-service/pkg/models"
)

// CommentHandler handles HTTP requests for comment operations
type CommentHandler struct {
	commentService *service.CommentService
}

// NewCommentHandler creates a new CommentHandler instance
func NewCommentHandler(commentService *service.CommentService) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
	}
}

// AddCommentRequest represents a request to add a comment
type AddCommentRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=2000"`
	ParentID string `json:"parent_id,omitempty"` // For nested replies
}

// CommentResponse represents a comment response
type CommentResponse struct {
	Comment *models.CommentWithDetails `json:"comment"`
	Success bool                       `json:"success"`
	Message string                     `json:"message"`
}

// AddComment handles POST /api/v1/posts/:id/comments
// @Summary Add a comment to a post
// @Description Add a comment or reply to a post (use parent_id for replies)
// @Tags comments
// @Accept json
// @Produce json
// @Param id path string true "Post ID"
// @Param request body AddCommentRequest true "Comment request"
// @Success 201 {object} CommentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts/{id}/comments [post]
func (h *CommentHandler) AddComment(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var req AddCommentRequest
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

	// Add comment
	comment, err := h.commentService.AddComment(c.Request.Context(), service.AddCommentInput{
		PostID:   postID,
		UserID:   userID.(string),
		ParentID: req.ParentID,
		Content:  req.Content,
	})
	if err != nil {
		if errors.Is(err, service.ErrCommentDepthExceeded) {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "depth_exceeded",
				Message: "comment depth limit exceeded (max 5 levels)",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "add_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, CommentResponse{
		Comment: &models.CommentWithDetails{
			Comment: *comment,
		},
		Success: true,
		Message: "comment added successfully",
	})
}

// GetCommentsQuery represents query parameters for getting comments
type GetCommentsQuery struct {
	Page  int `form:"page" binding:"omitempty,min=1"`
	Limit int `form:"limit" binding:"omitempty,min=1,max=100"`
}

// CommentsResponse represents a comments response
type CommentsResponse struct {
	Comments   []models.CommentWithDetails `json:"comments"`
	TotalCount int64                       `json:"total_count"`
	HasMore    bool                        `json:"has_more"`
	Page       int                         `json:"page"`
	Limit      int                         `json:"limit"`
}

// GetComments handles GET /api/v1/posts/:id/comments
// @Summary Get comments for a post
// @Description Get paginated comments for a post (top-level comments only)
// @Tags comments
// @Produce json
// @Param id path string true "Post ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} CommentsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/posts/{id}/comments [get]
func (h *CommentHandler) GetComments(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var query GetCommentsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_query",
			Message: err.Error(),
		})
		return
	}

	// Set defaults
	if query.Page == 0 {
		query.Page = 1
	}
	if query.Limit == 0 {
		query.Limit = 20
	}

	offset := int32((query.Page - 1) * query.Limit)

	// Get comments
	comments, err := h.commentService.GetComments(c.Request.Context(), service.GetCommentsInput{
		PostID: postID,
		Limit:  int32(query.Limit),
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	totalCount, err := h.commentService.CountTopLevelCommentsByPostID(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "count_failed",
			Message: err.Error(),
		})
		return
	}

	hasMore := int64(query.Page*query.Limit) < totalCount

	c.JSON(http.StatusOK, CommentsResponse{
		Comments:   comments,
		TotalCount: totalCount,
		HasMore:    hasMore,
		Page:       query.Page,
		Limit:      query.Limit,
	})
}

// GetCommentTree handles GET /api/v1/posts/:id/comments/tree
// @Summary Get comment tree for a post
// @Description Get full comment tree with nested replies for a post
// @Tags comments
// @Produce json
// @Param id path string true "Post ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} CommentsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/posts/{id}/comments/tree [get]
func (h *CommentHandler) GetCommentTree(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var query GetCommentsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_query",
			Message: err.Error(),
		})
		return
	}

	// Set defaults
	if query.Page == 0 {
		query.Page = 1
	}
	if query.Limit == 0 {
		query.Limit = 20
	}

	offset := int32((query.Page - 1) * query.Limit)

	// Get comment tree
	comments, err := h.commentService.GetCommentTree(c.Request.Context(), postID, int32(query.Limit), offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, CommentsResponse{
		Comments: comments,
		Page:     query.Page,
		Limit:    query.Limit,
	})
}

// GetReplies handles GET /api/v1/comments/:id/replies
// @Summary Get replies to a comment
// @Description Get nested replies to a specific comment
// @Tags comments
// @Produce json
// @Param id path string true "Comment ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} CommentsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/comments/{id}/replies [get]
func (h *CommentHandler) GetReplies(c *gin.Context) {
	parentID := c.Param("id")
	if parentID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "comment ID is required",
		})
		return
	}

	var query GetCommentsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_query",
			Message: err.Error(),
		})
		return
	}

	// Set defaults
	if query.Page == 0 {
		query.Page = 1
	}
	if query.Limit == 0 {
		query.Limit = 20
	}

	offset := int32((query.Page - 1) * query.Limit)

	// Get replies
	replies, err := h.commentService.GetReplies(c.Request.Context(), parentID, int32(query.Limit), offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, CommentsResponse{
		Comments: replies,
		Page:     query.Page,
		Limit:    query.Limit,
	})
}

// DeleteComment handles DELETE /api/v1/comments/:id
// @Summary Delete a comment
// @Description Delete a comment (only owner can delete)
// @Tags comments
// @Produce json
// @Param id path string true "Comment ID"
// @Success 204
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/comments/{id} [delete]
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	commentID := c.Param("id")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "comment ID is required",
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

	// Delete comment
	err := h.commentService.DeleteComment(c.Request.Context(), service.DeleteCommentInput{
		CommentID: commentID,
		UserID:    userID.(string),
	})
	if err != nil {
		if errors.Is(err, service.ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "comment not found",
			})
		} else if errors.Is(err, service.ErrUnauthorizedComment) {
			c.JSON(http.StatusForbidden, ErrorResponse{
				Error:   "forbidden",
				Message: "you can only delete your own comments",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "delete_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// UpdateCommentRequest represents a request to update a comment
type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// UpdateComment handles PUT /api/v1/comments/:id
// @Summary Update a comment
// @Description Update a comment's content (only owner can update)
// @Tags comments
// @Accept json
// @Produce json
// @Param id path string true "Comment ID"
// @Param request body UpdateCommentRequest true "Comment update request"
// @Success 200 {object} CommentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/comments/{id} [put]
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	commentID := c.Param("id")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "comment ID is required",
		})
		return
	}

	var req UpdateCommentRequest
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

	// Update comment
	comment, err := h.commentService.UpdateComment(c.Request.Context(), service.UpdateCommentInput{
		CommentID: commentID,
		UserID:    userID.(string),
		Content:   req.Content,
	})
	if err != nil {
		if errors.Is(err, service.ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "comment not found",
			})
		} else if errors.Is(err, service.ErrUnauthorizedComment) {
			c.JSON(http.StatusForbidden, ErrorResponse{
				Error:   "forbidden",
				Message: "you can only update your own comments",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "update_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, CommentResponse{
		Comment: &models.CommentWithDetails{
			Comment: *comment,
		},
		Success: true,
		Message: "comment updated successfully",
	})
}

// RegisterCommentRoutes registers comment routes with Gin router
func RegisterCommentRoutes(r *gin.RouterGroup, commentService *service.CommentService) {
	handler := NewCommentHandler(commentService)

	// Post comments routes
	posts := r.Group("/posts/:id/comments")
	{
		posts.POST("", handler.AddComment)
		posts.GET("", handler.GetComments)
		posts.GET("/tree", handler.GetCommentTree)
	}

	// Comment-specific routes
	comments := r.Group("/comments/:id")
	{
		comments.GET("/replies", handler.GetReplies)
		comments.PUT("", handler.UpdateComment)
		comments.DELETE("", handler.DeleteComment)
	}
}
