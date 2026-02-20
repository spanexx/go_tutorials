package service

import (
	"context"
	"errors"
	"time"

	"github.com/socialhub/auth-service/internal/config"
	"github.com/socialhub/auth-service/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// Common errors
var (
	ErrUserExists          = errors.New("user already exists")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrUserNotFound        = errors.New("user not found")
	ErrInvalidToken        = errors.New("invalid token")
	ErrEmailNotVerified    = errors.New("email not verified")
)

// AuthService handles authentication business logic
type AuthService struct {
	repo   *repository.UserRepository
	config *config.Config
}

// NewAuthService creates a new auth service
func NewAuthService(repo *repository.UserRepository, config *config.Config) *AuthService {
	return &AuthService{
		repo:   repo,
		config: config,
	}
}

// RegisterInput represents registration input
type RegisterInput struct {
	Email     string `json:"email" binding:"required,email"`
	Username  string `json:"username" binding:"required,alphanum,min=3,max=30"`
	Password  string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required"`
}

// LoginInput represents login input
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register creates a new user
func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*repository.User, error) {
	// Validate email format
	if !isValidEmail(input.Email) {
		return nil, errors.New("invalid email format")
	}

	// Validate username
	if len(input.Username) < 3 || len(input.Username) > 30 {
		return nil, errors.New("username must be between 3 and 30 characters")
	}

	// Validate password strength
	if err := validatePassword(input.Password); err != nil {
		return nil, err
	}

	// Check if email already exists
	if _, err := s.repo.GetUserByEmail(ctx, input.Email); err == nil {
		return nil, ErrUserExists
	}

	// Check if username already exists
	if _, err := s.repo.GetUserByUsername(ctx, input.Username); err == nil {
		return nil, ErrUserExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user
	user := &repository.User{
		ID:           generateUUID(),
		Email:        input.Email,
		Username:     input.Username,
		PasswordHash: string(hashedPassword),
		DisplayName:  input.DisplayName,
		AvatarURL:    "https://i.pravatar.cc/150?img=" + generateRandomAvatarID(),
		Bio:          "",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, errors.New("failed to create user")
	}

	return user, nil
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, input LoginInput) (*repository.User, error) {
	// Get user by email
	user, err := s.repo.GetUserByEmail(ctx, input.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
}

// Logout invalidates user session (for JWT, this would add token to blacklist)
func (s *AuthService) Logout(ctx context.Context, userID string) error {
	// For JWT-based auth, we would add the token to a blacklist in Redis
	// This is a placeholder for that functionality
	return nil
}

// GetCurrentUser retrieves the current user
func (s *AuthService) GetCurrentUser(ctx context.Context, userID string) (*repository.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

// UpdateProfile updates user profile
func (s *AuthService) UpdateProfile(ctx context.Context, userID string, displayName, bio, avatarURL string) (*repository.User, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if displayName != "" {
		user.DisplayName = displayName
	}
	if bio != "" {
		user.Bio = bio
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}
	user.UpdatedAt = time.Now()

	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return nil, errors.New("failed to update profile")
	}

	return user, nil
}

// validatePassword checks password strength
func validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, c := range password {
		switch {
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= '0' && c <= '9':
			hasDigit = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain uppercase, lowercase, and digit")
	}

	return nil
}

// isValidEmail validates email format (simple validation)
func isValidEmail(email string) bool {
	// Simple email validation - in production, use a proper regex or library
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	for i, c := range email {
		if c == '@' {
			if i == 0 || i == len(email)-1 {
				return false
			}
			return true
		}
	}
	return false
}

// generateUUID generates a new UUID
func generateUUID() string {
	// In production, use github.com/google/uuid
	return time.Now().Format("20060102150405") + "-" + time.Now().Format("999999999")
}

// generateRandomAvatarID generates a random avatar ID
func generateRandomAvatarID() string {
	// In production, use proper random generation
	return "1"
}
