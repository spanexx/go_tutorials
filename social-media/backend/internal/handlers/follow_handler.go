// Package handlers implements HTTP handlers for follow endpoints
package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/socialhub/auth-service/internal/service"
	"github.com/socialhub/auth-service/pkg/models"
)

// FollowHandler handles HTTP requests for follow operations
type FollowHandler struct {
	followService *service.FollowService
}

// NewFollowHandler creates a new FollowHandler instance
func NewFollowHandler(followService *service.FollowService) *FollowHandler {
	return &FollowHandler{
		followService: followService,
	}
}

// FollowUserRequest represents a request to follow a user
type FollowUserRequest struct {
	FollowingID string `json:"following_id" binding:"required"`
}

// FollowResponse represents a follow response
type FollowResponse struct {
	Follow  *models.FollowWithUser `json:"follow"`
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
}

// FollowUser handles POST /api/v1/users/id/:id/follow
// @Summary Follow a user
// @Description Follow a specific user
// @Tags follows
// @Accept json
// @Produce json
// @Param id path string true "User ID to follow"
// @Success 200 {object} FollowResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/users/id/{id}/follow [post]
func (h *FollowHandler) FollowUser(c *gin.Context) {
	followingID := c.Param("id")
	if followingID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
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

	// Follow user
	follow, err := h.followService.FollowUser(c.Request.Context(), service.FollowUserInput{
		FollowerID:  userID.(string),
		FollowingID: followingID,
	})
	if err != nil {
		if errors.Is(err, service.ErrSelfFollow) {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "self_follow",
				Message: "cannot follow yourself",
			})
		} else if errors.Is(err, service.ErrAlreadyFollowing) {
			c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "already_following",
				Message: "already following this user",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "follow_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, FollowResponse{
		Follow: &models.FollowWithUser{
			Follow: *follow,
		},
		Success: true,
		Message: "successfully followed user",
	})
}

// UnfollowUser handles DELETE /api/v1/users/id/:id/follow
// @Summary Unfollow a user
// @Description Unfollow a specific user
// @Tags follows
// @Produce json
// @Param id path string true "User ID to unfollow"
// @Success 200 {object} FollowResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/id/{id}/follow [delete]
func (h *FollowHandler) UnfollowUser(c *gin.Context) {
	followingID := c.Param("id")
	if followingID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
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

	// Unfollow user
	err := h.followService.UnfollowUser(c.Request.Context(), service.UnfollowUserInput{
		FollowerID:  userID.(string),
		FollowingID: followingID,
	})
	if err != nil {
		if errors.Is(err, service.ErrNotFollowing) {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_following",
				Message: "not following this user",
			})
		} else {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "unfollow_failed",
				Message: err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, FollowResponse{
		Success: true,
		Message: "successfully unfollowed user",
	})
}

// GetFollowers handles GET /api/v1/users/id/:id/followers
// @Summary Get user's followers
// @Description Get paginated list of users who follow a specific user
// @Tags follows
// @Produce json
// @Param id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} FollowersResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/users/id/{id}/followers [get]
func (h *FollowHandler) GetFollowers(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
		})
		return
	}

	// Get pagination params
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := int32((page - 1) * limit)

	// Get total count
	totalCount, err := h.followService.CountFollowers(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "count_failed",
			Message: err.Error(),
		})
		return
	}

	// Get followers
	followers, err := h.followService.GetFollowers(c.Request.Context(), service.GetFollowersInput{
		UserID:   userID,
		ViewerID: c.GetString("user_id"),
		Limit:    int32(limit),
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	hasMore := int64(page*limit) < totalCount

	c.JSON(http.StatusOK, FollowersResponse{
		Followers: followers,
		Total:     int(totalCount),
		HasMore:   hasMore,
		Page:      page,
		Limit:     limit,
		Success:   true,
	})
}

// FollowersResponse represents a followers response
type FollowersResponse struct {
	Followers []models.FollowWithUser `json:"followers"`
	Total     int                     `json:"total"`
	HasMore   bool                    `json:"has_more"`
	Page      int                     `json:"page"`
	Limit     int                     `json:"limit"`
	Success   bool                    `json:"success"`
}

// GetFollowing handles GET /api/v1/users/id/:id/following
// @Summary Get users that a user follows
// @Description Get paginated list of users that a specific user follows
// @Tags follows
// @Produce json
// @Param id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} FollowingResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/users/id/{id}/following [get]
func (h *FollowHandler) GetFollowing(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
		})
		return
	}

	// Get pagination params
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := int32((page - 1) * limit)

	// Get total count
	totalCount, err := h.followService.CountFollowing(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "count_failed",
			Message: err.Error(),
		})
		return
	}

	// Get following
	following, err := h.followService.GetFollowing(c.Request.Context(), service.GetFollowingInput{
		UserID:   userID,
		ViewerID: c.GetString("user_id"),
		Limit:    int32(limit),
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	hasMore := int64(page*limit) < totalCount

	c.JSON(http.StatusOK, FollowingResponse{
		Following: following,
		Total:     int(totalCount),
		HasMore:   hasMore,
		Page:      page,
		Limit:     limit,
		Success:   true,
	})
}

// FollowingResponse represents a following response
type FollowingResponse struct {
	Following []models.FollowWithUser `json:"following"`
	Total     int                     `json:"total"`
	HasMore   bool                    `json:"has_more"`
	Page      int                     `json:"page"`
	Limit     int                     `json:"limit"`
	Success   bool                    `json:"success"`
}

// GetFollowCounts handles GET /api/v1/users/id/:id/follow/counts
// @Summary Get follow counts for a user
// @Description Get follower and following counts for a specific user
// @Tags follows
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} FollowCountsResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/users/id/{id}/follow/counts [get]
func (h *FollowHandler) GetFollowCounts(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_id",
			Message: "user ID is required",
		})
		return
	}

	// Get follow counts
	counts, err := h.followService.GetFollowCounts(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, FollowCountsResponse{
		Counts:  counts,
		Success: true,
	})
}

// FollowCountsResponse represents a follow counts response
type FollowCountsResponse struct {
	Counts  *service.FollowCounts `json:"counts"`
	Success bool                  `json:"success"`
}

// RegisterFollowRoutes registers follow routes with Gin router
func RegisterFollowRoutes(r *gin.RouterGroup, followService *service.FollowService) {
	handler := NewFollowHandler(followService)

	follows := r.Group("/users/id/:id/follow")
	{
		follows.POST("", handler.FollowUser)
		follows.DELETE("", handler.UnfollowUser)
	}

	r.GET("/users/id/:id/followers", handler.GetFollowers)
	r.GET("/users/id/:id/following", handler.GetFollowing)
	r.GET("/users/id/:id/follow/counts", handler.GetFollowCounts)
}
