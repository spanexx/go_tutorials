package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/service"
)

// UserHandler handles user profile API requests
type UserHandler struct {
	authService *service.AuthService
}

// NewUserHandler creates a new user handler
func NewUserHandler(authService *service.AuthService) *UserHandler {
	return &UserHandler{
		authService: authService,
	}
}

// UserProfile represents a user profile response
type UserProfile struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	AvatarURL    string `json:"avatar_url"`
	Bio          string `json:"bio"`
	Followers    int    `json:"followers_count"`
	Following    int    `json:"following_count"`
	PostsCount   int    `json:"posts_count"`
	IsFollowing  bool   `json:"is_following"`
	IsVerified   bool   `json:"is_verified"`
	CreatedAt    string `json:"created_at"`
}

// GetUserByUsername returns a user profile by username
// @Summary Get user profile
// @Description Get user profile by username
// @Tags users
// @Security BearerAuth
// @Param username path string true "Username"
// @Success 200 {object} UserProfile
// @Failure 404 {object} map[string]string
// @Router /api/v1/users/{username} [get]
func (h *UserHandler) GetUserByUsername(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	// In a full implementation, fetch from database by username
	// For now, return sample profile data
	profile := UserProfile{
		ID:          "1",
		Username:    username,
		DisplayName: "John Doe",
		AvatarURL:   "https://i.pravatar.cc/150?img=1",
		Bio:         "Software developer | Tech enthusiast | Coffee lover",
		Followers:   1250,
		Following:   345,
		PostsCount:  89,
		IsFollowing: false,
		IsVerified:  false,
		CreatedAt:   "2025-06-15T10:30:00Z",
	}

	c.JSON(http.StatusOK, profile)
}

// GetUserByID returns a user profile by ID
// @Summary Get user profile by ID
// @Description Get user profile by ID
// @Tags users
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} UserProfile
// @Failure 404 {object} map[string]string
// @Router /api/v1/users/id/{id} [get]
func (h *UserHandler) GetUserByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	// In a full implementation, fetch from database
	profile := UserProfile{
		ID:          id,
		Username:    "johndoe",
		DisplayName: "John Doe",
		AvatarURL:   "https://i.pravatar.cc/150?img=1",
		Bio:         "Software developer",
		Followers:   1250,
		Following:   345,
		PostsCount:  89,
		IsFollowing: false,
		IsVerified:  false,
		CreatedAt:   "2025-06-15T10:30:00Z",
	}

	c.JSON(http.StatusOK, profile)
}

// FollowUser follows a user
// @Summary Follow a user
// @Description Follow a user by username
// @Tags users
// @Security BearerAuth
// @Param username path string true "Username"
// @Success 200 {object} map[string]string
// @Router /api/v1/users/{username}/follow [post]
func (h *UserHandler) FollowUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	// In a full implementation, create follow relationship
	c.JSON(http.StatusOK, gin.H{"message": "Successfully followed " + username})
}

// UnfollowUser unfollows a user
// @Summary Unfollow a user
// @Description Unfollow a user by username
// @Tags users
// @Security BearerAuth
// @Param username path string true "Username"
// @Success 200 {object} map[string]string
// @Router /api/v1/users/{username}/unfollow [post]
func (h *UserHandler) UnfollowUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	// In a full implementation, delete follow relationship
	c.JSON(http.StatusOK, gin.H{"message": "Successfully unfollowed " + username})
}
