package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/socialhub/auth-service/internal/config"
	"github.com/socialhub/auth-service/internal/email"
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
	redis  *redis.Client
	email  *email.EmailService
}

// NewAuthService creates a new auth service
func NewAuthService(repo *repository.UserRepository, config *config.Config, redis *redis.Client, emailService *email.EmailService) *AuthService {
	return &AuthService{
		repo:   repo,
		config: config,
		redis:  redis,
		email:  emailService,
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
		ID:            generateUUID(),
		Email:         input.Email,
		Username:      input.Username,
		PasswordHash:  string(hashedPassword),
		DisplayName:   input.DisplayName,
		AvatarURL:     "https://i.pravatar.cc/150?img=" + generateRandomAvatarID(),
		Bio:           "",
		EmailVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		log.Printf("[AUTH] CreateUser database error: %v", err)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Send welcome email asynchronously (non-blocking)
	if s.email != nil && s.email.IsEnabled() {
		go func(userID, userEmail, userName string) {
			emailCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			if err := s.email.SendWelcomeEmail(emailCtx, userEmail, userName); err != nil {
				log.Printf("Warning: Failed to send welcome email to %s: %v", userEmail, err)
			}
		}(user.ID, user.Email, user.DisplayName)

		// Generate verification token and send verification email
		go func(userID, userEmail, userName string) {
			emailCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			token, err := s.GenerateEmailVerificationToken(emailCtx, userID)
			if err != nil {
				log.Printf("Warning: Failed to generate verification token for %s: %v", userEmail, err)
				return
			}

			if err := s.email.SendVerificationEmail(emailCtx, userEmail, userName, token); err != nil {
				log.Printf("Warning: Failed to send verification email to %s: %v", userEmail, err)
			}
		}(user.ID, user.Email, user.DisplayName)
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

// Logout invalidates user session by adding token to Redis blacklist
func (s *AuthService) Logout(ctx context.Context, token string, expiry time.Duration) error {
	if s.redis == nil {
		// Redis not configured, skip blacklisting
		return nil
	}

	// Create a unique key for the blacklisted token
	key := fmt.Sprintf("blacklist:%s", token)

	// Store token in Redis with TTL matching token expiration
	return s.redis.Set(ctx, key, "1", expiry).Err()
}

// IsTokenBlacklisted checks if a token is in the blacklist
func (s *AuthService) IsTokenBlacklisted(ctx context.Context, token string) bool {
	if s.redis == nil {
		return false
	}

	key := fmt.Sprintf("blacklist:%s", token)
	_, err := s.redis.Get(ctx, key).Result()
	return err == nil
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

// generateUUID generates a new UUID using google/uuid
func generateUUID() string {
	return uuid.New().String()
}

// generateRandomAvatarID generates a random avatar ID (1-70 for pravatar.cc)
func generateRandomAvatarID() string {
	max := big.NewInt(70)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "1" // Fallback
	}
	return n.String()
}

// generateVerificationToken generates a secure random token for email verification
func generateVerificationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateEmailVerificationToken generates an email verification token for a user
func (s *AuthService) GenerateEmailVerificationToken(ctx context.Context, userID string) (string, error) {
	token, err := generateVerificationToken()
	if err != nil {
		return "", errors.New("failed to generate verification token")
	}

	// Set expiration to 24 hours from now
	expires := time.Now().Add(24 * time.Hour)

	// Store token in database
	if err := s.repo.UpdateEmailVerification(ctx, userID, false, &token, &expires); err != nil {
		return "", errors.New("failed to store verification token")
	}

	return token, nil
}

// VerifyEmailToken verifies an email verification token and marks the user's email as verified
func (s *AuthService) VerifyEmailToken(ctx context.Context, token string) error {
	if token == "" {
		return errors.New("token required")
	}

	// Look up user by verification token
	user, err := s.repo.GetUserByEmailVerificationToken(ctx, token)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	// Check if already verified
	if user.EmailVerified {
		return errors.New("email already verified")
	}

	// Mark email as verified and clear token
	if err := s.repo.UpdateEmailVerification(ctx, user.ID, true, nil, nil); err != nil {
		return errors.New("failed to update verification status")
	}

	return nil
}

// ResendVerificationEmail resends the verification email to a user
func (s *AuthService) ResendVerificationEmail(ctx context.Context, email string) error {
	if s.email == nil || !s.email.IsEnabled() {
		return errors.New("email service not available")
	}

	// Rate limiting: max 1 request per 60 seconds per email
	if s.redis != nil {
		rateKey := fmt.Sprintf("resend_verification_rate:%s", email)

		// Get current count
		count, err := s.redis.Get(ctx, rateKey).Int()
		if err == nil && count >= 1 {
			// Rate limit exceeded - return error
			return errors.New("please wait 60 seconds before requesting another verification email")
		}

		// Increment counter with 60-second expiry
		pipe := s.redis.Pipeline()
		pipe.Incr(ctx, rateKey)
		pipe.Expire(ctx, rateKey, 60*time.Second)
		_, _ = pipe.Exec(ctx)
	}

	// Get user by email
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}

	// Check if already verified
	if user.EmailVerified {
		return errors.New("email already verified")
	}

	// Generate new verification token
	token, err := s.GenerateEmailVerificationToken(ctx, user.ID)
	if err != nil {
		return err
	}

	// Audit log
	log.Printf("[AUDIT] Verification email requested for user %s (%s)", user.Email, user.ID)

	// Send verification email asynchronously
	go func(userID, userEmail, userName, verificationToken string) {
		emailCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		startTime := time.Now()
		if err := s.email.SendVerificationEmail(emailCtx, userEmail, userName, verificationToken); err != nil {
			log.Printf("[AUDIT] Verification email failed for %s: %v", userEmail, err)
		} else {
			log.Printf("[AUDIT] Verification email sent to %s in %v", userEmail, time.Since(startTime))
		}
	}(user.ID, user.Email, user.DisplayName, token)

	return nil
}

// RequestPasswordReset generates a password reset token and sends reset email
func (s *AuthService) RequestPasswordReset(ctx context.Context, email, ip string) error {
	// Rate limiting by email: max 3 requests per hour per email
	if s.redis != nil {
		rateKey := fmt.Sprintf("password_reset_rate:%s", email)

		// Get current count
		count, err := s.redis.Get(ctx, rateKey).Int()
		if err == nil && count >= 3 {
			// Rate limit exceeded - still return success to prevent enumeration
			log.Printf("[AUDIT] Password reset rate limit exceeded for email %s from IP %s", email, ip)
			return nil
		}

		// Increment counter with 1-hour expiry
		pipe := s.redis.Pipeline()
		pipe.Incr(ctx, rateKey)
		pipe.Expire(ctx, rateKey, 1*time.Hour)
		_, _ = pipe.Exec(ctx)
	}

	// Rate limiting by IP: max 5 requests per hour per IP
	if s.redis != nil && ip != "" {
		ipRateKey := fmt.Sprintf("password_reset_rate_ip:%s", ip)

		count, err := s.redis.Get(ctx, ipRateKey).Int()
		if err == nil && count >= 5 {
			log.Printf("[AUDIT] Password reset rate limit exceeded for IP %s", ip)
			return nil
		}

		pipe := s.redis.Pipeline()
		pipe.Incr(ctx, ipRateKey)
		pipe.Expire(ctx, ipRateKey, 1*time.Hour)
		_, _ = pipe.Exec(ctx)
	}

	if s.email == nil || !s.email.IsEnabled() {
		// Still generate token even if email is not available
		// This prevents enumeration attacks
	}

	// Get user by email
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		// Don't reveal if user exists or not
		return nil
	}

	// Audit log
	log.Printf("[AUDIT] Password reset requested for user %s (%s) from IP %s", user.Email, user.ID, ip)

	// Generate reset token
	token, err := generateVerificationToken()
	if err != nil {
		return errors.New("failed to generate reset token")
	}

	// Set expiration to 1 hour from now
	expires := time.Now().Add(1 * time.Hour)

	// Store token in database
	if err := s.repo.UpdatePasswordResetToken(ctx, user.ID, &token, &expires); err != nil {
		return errors.New("failed to store reset token")
	}

	// Send password reset email asynchronously
	if s.email != nil && s.email.IsEnabled() {
		go func(userID, userEmail, userName, resetToken string) {
			emailCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			startTime := time.Now()
			if err := s.email.SendPasswordResetEmail(emailCtx, userEmail, userName, resetToken); err != nil {
				log.Printf("[AUDIT] Password reset email failed for %s: %v", userEmail, err)
			} else {
				log.Printf("[AUDIT] Password reset email sent to %s in %v", userEmail, time.Since(startTime))
			}
		}(user.ID, user.Email, user.DisplayName, token)
	}

	return nil
}

// ResetPassword resets a user's password using a reset token
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if token == "" {
		return errors.New("token required")
	}

	// Validate password strength
	if err := validatePassword(newPassword); err != nil {
		return err
	}

	// Look up user by reset token
	user, err := s.repo.GetUserByPasswordResetToken(ctx, token)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}

	// Update password and clear reset token
	if err := s.repo.UpdatePassword(ctx, user.ID, string(hashedPassword)); err != nil {
		return errors.New("failed to update password")
	}

	return nil
}
