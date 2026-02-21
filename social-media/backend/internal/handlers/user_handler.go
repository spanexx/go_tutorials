package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/service"
)

// UserHandler handles user profile API requests
type UserHandler struct {
	authService *service.AuthService
	db          *sql.DB
}

// NewUserHandler creates a new user handler
func NewUserHandler(authService *service.AuthService) *UserHandler {
	return &UserHandler{
		authService: authService,
		db:          authService.DB(),
	}
}

// UserProfile represents a user profile response
type UserProfile struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Bio         string `json:"bio"`
	Followers   int    `json:"followers_count"`
	Following   int    `json:"following_count"`
	PostsCount  int    `json:"posts_count"`
	IsFollowing bool   `json:"is_following"`
	IsVerified  bool   `json:"is_verified"`
	CreatedAt   string `json:"created_at"`
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

	user, err := h.authService.GetUserByUsername(c.Request.Context(), username)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	followers, following, postsCount, err := h.getCounts(c, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user profile"})
		return
	}

	profile := UserProfile{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
		Followers:   followers,
		Following:   following,
		PostsCount:  postsCount,
		IsFollowing: false,
		IsVerified:  user.EmailVerified,
		CreatedAt:   user.CreatedAt.UTC().Format(time.RFC3339),
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

	user, err := h.authService.GetCurrentUser(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	followers, following, postsCount, err := h.getCounts(c, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user profile"})
		return
	}

	profile := UserProfile{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
		Followers:   followers,
		Following:   following,
		PostsCount:  postsCount,
		IsFollowing: false,
		IsVerified:  user.EmailVerified,
		CreatedAt:   user.CreatedAt.UTC().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, profile)
}

func (h *UserHandler) getCounts(c *gin.Context, userID string) (followers int, following int, posts int, err error) {
	var followers64, following64, posts64 int64

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM follows WHERE following_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&followers64)
	if err != nil {
		return 0, 0, 0, err
	}

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&following64)
	if err != nil {
		return 0, 0, 0, err
	}

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&posts64)
	if err != nil {
		return 0, 0, 0, err
	}

	return int(followers64), int(following64), int(posts64), nil
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
