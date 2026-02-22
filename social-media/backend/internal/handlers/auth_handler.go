package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/auth"
	"github.com/socialhub/auth-service/internal/service"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService *service.AuthService
	jwtManager  *auth.JWTManager
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *service.AuthService, jwtSecret string, jwtExpiry time.Duration, refreshExpiry time.Duration) *AuthHandler {
	jwtManager := auth.NewJWTManager(
		jwtSecret,
		jwtExpiry,
		refreshExpiry,
	)

	return &AuthHandler{
		authService: authService,
		jwtManager:  jwtManager,
	}
}

// RegisterRequest represents registration request
type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Username    string `json:"username" binding:"required,alphanum,min=3,max=30"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required"`
}

// LoginRequest represents login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
}

// UserResponse represents user response
type UserResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Bio         string `json:"bio"`
}

// Register registers a new user
// @Summary Register a new user
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} AuthResponse
// @Failure 400 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	rid := c.GetString("request_id")
	log.Printf("[AUTH] Register attempt starting request_id=%s", rid)
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[AUTH] Register request binding failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[AUTH] Register request received request_id=%s email=%s username=%s", rid, req.Email, req.Username)

	input := service.RegisterInput{
		Email:       req.Email,
		Username:    req.Username,
		Password:    req.Password,
		DisplayName: req.DisplayName,
	}

	user, err := h.authService.Register(c.Request.Context(), input)
	if err != nil {
		log.Printf("[AUTH] Register failed request_id=%s email=%s: %v", rid, req.Email, err)
		switch err {
		case service.ErrUserExists:
			c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	log.Printf("[AUTH] Register successful request_id=%s email=%s user_id=%s", rid, user.Email, user.ID)

	// Generate tokens
	log.Printf("[AUTH] Generating JWT tokens request_id=%s user_id=%s", rid, user.ID)
	tokens, err := h.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Username)
	if err != nil {
		log.Printf("[AUTH] Token generation failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	response := AuthResponse{
		User: UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Bio:         user.Bio,
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}

	c.JSON(http.StatusCreated, response)
}

// Login authenticates a user
// @Summary Login user
// @Description Authenticate user and return tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	rid := c.GetString("request_id")
	log.Printf("[AUTH] Login attempt starting request_id=%s", rid)
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[AUTH] Login request binding failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[AUTH] Login request received request_id=%s email=%s", rid, req.Email)

	input := service.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	}

	user, err := h.authService.Login(c.Request.Context(), input)
	if err != nil {
		log.Printf("[AUTH] Login failed request_id=%s email=%s: %v", rid, req.Email, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	log.Printf("[AUTH] Login successful request_id=%s email=%s user_id=%s", rid, user.Email, user.ID)

	// Generate tokens
	log.Printf("[AUTH] Generating JWT tokens request_id=%s user_id=%s", rid, user.ID)
	tokens, err := h.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Username)
	if err != nil {
		log.Printf("[AUTH] Token generation failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	response := AuthResponse{
		User: UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Bio:         user.Bio,
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}
	log.Println("[AUTH] Login response prepared, sending to client")
	c.JSON(http.StatusOK, response)
}

// Logout logs out a user
// @Summary Logout user
// @Description Invalidate user session
// @Tags auth
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get the token from Authorization header
	authHeader := c.GetHeader("Authorization")
	token := ""
	if parts := strings.Split(authHeader, " "); len(parts) == 2 && parts[0] == "Bearer" {
		token = parts[1]
	}

	// Logout with token blacklisting (15 min expiry matches access token expiry)
	if err := h.authService.Logout(c.Request.Context(), token, 15*time.Minute); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// RefreshToken refreshes access token
// @Summary Refresh access token
// @Description Get new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body object true "Refresh token"
// @Success 200 {object} object
// @Failure 401 {object} map[string]string
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	user, err := h.authService.GetCurrentUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	tokens, err := h.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_in":    tokens.ExpiresIn,
	})
}

// VerifyEmail verifies user email
// @Summary Verify email
// @Description Verify user email with token
// @Tags auth
// @Param token path string true "Verification token"
// @Success 200 {object} map[string]string
// @Router /api/v1/auth/verify/{token} [get]
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token required"})
		return
	}

	// Verify the token and update user's email verified status
	if err := h.authService.VerifyEmailToken(c.Request.Context(), token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Email verified successfully",
		"verified": true,
	})
}

// GetCurrentUser gets current authenticated user
// @Summary Get current user
// @Description Get current authenticated user details
// @Tags auth
// @Security BearerAuth
// @Success 200 {object} UserResponse
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID := c.GetString("user_id")

	user, err := h.authService.GetCurrentUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	response := UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfile updates user profile
// @Summary Update profile
// @Description Update current user profile
// @Tags auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body handlers.UpdateProfileRequest true "Profile update"
// @Success 200 {object} handlers.UserResponse
// @Router /api/v1/user/profile [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authService.UpdateProfile(c.Request.Context(), userID, req.DisplayName, req.Bio, req.AvatarURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
	}

	c.JSON(http.StatusOK, response)
}

// ResendVerificationRequest represents resend verification request
type ResendVerificationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResendVerification resends verification email
// @Summary Resend verification email
// @Description Resend verification email to user
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResendVerificationRequest true "Email address"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/auth/resend-verification [post]
func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var req ResendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.ResendVerificationEmail(c.Request.Context(), req.Email); err != nil {
		switch err.Error() {
		case "email service not available":
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Email service not available"})
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		case "email already verified":
			c.JSON(http.StatusConflict, gin.H{"error": "Email already verified"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification email sent"})
}

// ForgotPasswordRequest represents forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPassword initiates password reset flow
// @Summary Forgot password
// @Description Send password reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ForgotPasswordRequest true "Email address"
// @Success 200 {object} map[string]string
// @Router /api/v1/auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get client IP address
	ip := c.ClientIP()

	// Always return success to prevent email enumeration
	if err := h.authService.RequestPasswordReset(c.Request.Context(), req.Email, ip); err != nil {
		// Log error but don't expose to user
		log.Printf("Password reset error: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "If an account exists with that email, a password reset link has been sent"})
}

// ResetPasswordRequest represents reset password request
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// ResetPassword resets user password with token
// @Summary Reset password
// @Description Reset password with token from email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResetPasswordRequest true "Token and new password"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		switch err.Error() {
		case "token required":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		case "invalid or expired token":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
	AvatarURL   string `json:"avatar_url"`
}
