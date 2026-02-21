// Package handlers implements HTTP handlers for post endpoints
package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/socialhub/auth-service/internal/service"
	"github.com/socialhub/auth-service/pkg/models"
)

var validate = validator.New()

// PostHandler handles HTTP requests for post operations
type PostHandler struct {
	postService     *service.PostService
	reactionService *service.ReactionService
	commentService  *service.CommentService
}

// NewPostHandler creates a new PostHandler instance
func NewPostHandler(
	postService *service.PostService,
	reactionService *service.ReactionService,
	commentService *service.CommentService,
) *PostHandler {
	return &PostHandler{
		postService:     postService,
		reactionService: reactionService,
		commentService:  commentService,
	}
}

// CreatePostRequest represents a request to create a post
type CreatePostRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=5000"`
	ImageURL string `json:"image_url,omitempty"`
	VideoURL string `json:"video_url,omitempty"`
}

// CreatePost handles POST /api/v1/posts
// @Summary Create a new post
// @Description Create a new post with content and optional media
// @Tags posts
// @Accept json
// @Produce json
// @Param request body CreatePostRequest true "Post creation request"
// @Success 201 {object} models.Post
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts [post]
func (h *PostHandler) CreatePost(c *gin.Context) {
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "user not authenticated",
		})
		return
	}

	// Create post
	post, err := h.postService.CreatePost(c.Request.Context(), service.CreatePostInput{
		UserID:   userID.(string),
		Content:  req.Content,
		ImageURL: req.ImageURL,
		VideoURL: req.VideoURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "create_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// GetPost handles GET /api/v1/posts/:id
// @Summary Get a post by ID
// @Description Get a specific post by its ID
// @Tags posts
// @Produce json
// @Param id path string true "Post ID"
// @Success 200 {object} models.PostWithDetails
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/posts/{id} [get]
func (h *PostHandler) GetPost(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	// Get user ID from context (optional for public posts)
	var userIDStr string
	if userID, exists := c.Get("user_id"); exists {
		userIDStr = userID.(string)
	}

	post, err := h.postService.GetPost(c.Request.Context(), postID, userIDStr)
	if err != nil {
		if errors.Is(err, service.ErrPostNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "post not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, post)
}

// UpdatePost handles PUT /api/v1/posts/:id
// @Summary Update a post
// @Description Update an existing post (only owner can update)
// @Tags posts
// @Accept json
// @Produce json
// @Param id path string true "Post ID"
// @Param request body UpdatePostRequest true "Post update request"
// @Success 200 {object} models.Post
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/posts/{id} [put]
func (h *PostHandler) UpdatePost(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "post ID is required",
		})
		return
	}

	var req UpdatePostRequest
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

	post, err := h.postService.UpdatePost(c.Request.Context(), service.UpdatePostInput{
		PostID:   postID,
		UserID:   userID.(string),
		Content:  req.Content,
		ImageURL: req.ImageURL,
		VideoURL: req.VideoURL,
	})
	if err != nil {
		if errors.Is(err, service.ErrPostNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "post not found",
			})
		} else if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusForbidden, ErrorResponse{
				Error:   "forbidden",
				Message: "you can only update your own posts",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "update_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, post)
}

// UpdatePostRequest represents a request to update a post
type UpdatePostRequest struct {
	Content  string `json:"content,omitempty" binding:"omitempty,min=1,max=5000"`
	ImageURL string `json:"image_url,omitempty"`
	VideoURL string `json:"video_url,omitempty"`
}

// DeletePost handles DELETE /api/v1/posts/:id
// @Summary Delete a post
// @Description Delete an existing post (only owner can delete)
// @Tags posts
// @Produce json
// @Param id path string true "Post ID"
// @Success 204
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/posts/{id} [delete]
func (h *PostHandler) DeletePost(c *gin.Context) {
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

	err := h.postService.DeletePost(c.Request.Context(), postID, userID.(string))
	if err != nil {
		if errors.Is(err, service.ErrPostNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "post not found",
			})
		} else if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusForbidden, ErrorResponse{
				Error:   "forbidden",
				Message: "you can only delete your own posts",
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

// GetFeedQuery represents query parameters for feed endpoint
type GetFeedQuery struct {
	Type  string `form:"type" binding:"omitempty,oneof=home trending latest"`
	Page  int    `form:"page" binding:"omitempty,min=1"`
	Limit int    `form:"limit" binding:"omitempty,min=1,max=100"`
}

// FeedResponse represents a paginated feed response
type FeedResponse struct {
	Posts      []models.PostWithDetails `json:"posts"`
	TotalCount int64                    `json:"total_count"`
	HasMore    bool                     `json:"has_more"`
	Page       int                      `json:"page"`
	Limit      int                      `json:"limit"`
}

// GetFeed handles GET /api/v1/feed
// @Summary Get user's feed
// @Description Get paginated feed with posts based on feed type
// @Tags posts
// @Produce json
// @Param type query string false "Feed type: home, trending, latest" default(home)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} FeedResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/feed [get]
func (h *PostHandler) GetFeed(c *gin.Context) {
	var query GetFeedQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_query",
			Message: err.Error(),
		})
		return
	}

	// Set defaults
	if query.Type == "" {
		query.Type = "home"
	}
	if query.Page == 0 {
		query.Page = 1
	}
	if query.Limit == 0 {
		query.Limit = 20
	}

	// Map feed type
	var feedType service.FeedType
	switch query.Type {
	case "home":
		feedType = service.FeedTypeHome
		// Check authentication for home feed
		if _, exists := c.Get("user_id"); !exists {
			c.JSON(http.StatusUnauthorized, ErrorResponse{
				Error:   "unauthorized",
				Message: "authentication required for home feed",
			})
			return
		}
	case "trending":
		feedType = service.FeedTypeTrending
	case "latest":
		feedType = service.FeedTypeLatest
	}

	// Calculate offset
	offset := int32((query.Page - 1) * query.Limit)

	// Get user ID from context (optional for trending/latest feeds)
	var userIDStr string
	if userID, exists := c.Get("user_id"); exists {
		userIDStr = userID.(string)
	}

	// Get feed
	posts, err := h.postService.GetFeed(c.Request.Context(), service.GetFeedInput{
		UserID:   userIDStr,
		FeedType: feedType,
		Limit:    int32(query.Limit),
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	totalCount, err := h.postService.CountFeedPosts(c.Request.Context(), feedType, userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "count_failed",
			Message: err.Error(),
		})
		return
	}

	hasMore := int64(query.Page*query.Limit) < totalCount

	c.JSON(http.StatusOK, FeedResponse{
		Posts:      posts,
		TotalCount: totalCount,
		HasMore:    hasMore,
		Page:       query.Page,
		Limit:      query.Limit,
	})
}

// GetPostsByUser handles GET /api/v1/users/:user_id/posts
// @Summary Get posts by user
// @Description Get paginated posts by a specific user
// @Tags posts
// @Produce json
// @Param user_id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} PostsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/users/{user_id}/posts [get]
func (h *PostHandler) GetPostsByUser(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
		})
		return
	}

	var query PaginationQuery
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

	posts, err := h.postService.GetPostsByUser(c.Request.Context(), userID, int32(query.Limit), offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, PostsResponse{
		Posts: posts,
		Page:  query.Page,
		Limit: query.Limit,
	})
}

// GetPostsByHashtag handles GET /api/v1/hashtag/:tag
// @Summary Get posts by hashtag
// @Description Get paginated posts with a specific hashtag
// @Tags posts
// @Produce json
// @Param tag path string true "Hashtag (without #)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} PostsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/hashtag/{tag} [get]
func (h *PostHandler) GetPostsByHashtag(c *gin.Context) {
	tag := c.Param("tag")
	if tag == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_tag",
			Message: "hashtag is required",
		})
		return
	}

	var query PaginationQuery
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

	posts, err := h.postService.GetPostsByHashtag(c.Request.Context(), tag, int32(query.Limit), offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, PostsResponse{
		Posts: posts,
		Page:  query.Page,
		Limit: query.Limit,
	})
}

// PaginationQuery represents common pagination query parameters
type PaginationQuery struct {
	Page  int `form:"page" binding:"omitempty,min=1"`
	Limit int `form:"limit" binding:"omitempty,min=1,max=100"`
}

// PostsResponse represents a paginated posts response
type PostsResponse struct {
	Posts []models.Post `json:"posts"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// RegisterPostRoutes registers post routes with Gin router
func RegisterPostRoutes(
	r *gin.RouterGroup,
	postService *service.PostService,
	reactionService *service.ReactionService,
	commentService *service.CommentService,
) {
	handler := NewPostHandler(postService, reactionService, commentService)

	posts := r.Group("/posts")
	{
		posts.POST("", handler.CreatePost)
		posts.GET("/:id", handler.GetPost)
		posts.PUT("/:id", handler.UpdatePost)
		posts.DELETE("/:id", handler.DeletePost)
	}

	r.GET("/feed", handler.GetFeed)
	r.GET("/users/:user_id/posts", handler.GetPostsByUser)
	r.GET("/hashtag/:tag", handler.GetPostsByHashtag)
}
