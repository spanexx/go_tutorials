package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	_ "github.com/lib/pq"
)

// User represents a user in the database
type User struct {
	ID                       string    `json:"id"`
	Email                    string    `json:"email"`
	Username                 string    `json:"username"`
	PasswordHash             string    `json:"-"`
	DisplayName              string    `json:"display_name"`
	AvatarURL                string    `json:"avatar_url"`
	Bio                      string    `json:"bio"`
	EmailVerified            bool      `json:"email_verified"`
	EmailVerificationToken   *string   `json:"-"`
	EmailVerificationExpires *time.Time `json:"-"`
	PasswordResetToken       *string   `json:"-"`
	PasswordResetExpires     *time.Time `json:"-"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

// UserRepository handles database operations for users
type UserRepository struct {
	db *sql.DB
}

// NewRepository creates a new database repository
func NewRepository(databaseURL string) (*UserRepository, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &UserRepository{db: db}, nil
}

// Close closes the database connection
func (r *UserRepository) Close() error {
	return r.db.Close()
}

func (r *UserRepository) DB() *sql.DB {
	return r.db
}

// CreateUser creates a new user in the database
func (r *UserRepository) CreateUser(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (id, email, username, password_hash, display_name, avatar_url, bio, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.Username,
		user.PasswordHash,
		user.DisplayName,
		user.AvatarURL,
		user.Bio,
		user.EmailVerified,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return err
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, username, password_hash, display_name, avatar_url, bio, 
		       email_verified, email_verification_token, email_verification_expires,
		       password_reset_token, password_reset_expires, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	user := &User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpires,
		&user.PasswordResetToken,
		&user.PasswordResetExpires,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	return user, err
}

// GetUserByEmail retrieves a user by email
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, username, password_hash, display_name, avatar_url, bio, 
		       email_verified, email_verification_token, email_verification_expires,
		       password_reset_token, password_reset_expires, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	user := &User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpires,
		&user.PasswordResetToken,
		&user.PasswordResetExpires,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	return user, err
}

// GetUserByUsername retrieves a user by username
func (r *UserRepository) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	query := `
		SELECT id, email, username, password_hash, display_name, avatar_url, bio, 
		       email_verified, email_verification_token, email_verification_expires,
		       password_reset_token, password_reset_expires, created_at, updated_at
		FROM users
		WHERE username = $1
	`
	user := &User{}
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpires,
		&user.PasswordResetToken,
		&user.PasswordResetExpires,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	return user, err
}

// UpdateUser updates a user's information
func (r *UserRepository) UpdateUser(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET display_name = $2, avatar_url = $3, bio = $4, updated_at = $5
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.DisplayName,
		user.AvatarURL,
		user.Bio,
		user.UpdatedAt,
	)
	return err
}

// UpdateEmailVerification updates email verification status for a user
func (r *UserRepository) UpdateEmailVerification(ctx context.Context, userID string, verified bool, token *string, expires *time.Time) error {
	query := `
		UPDATE users
		SET email_verified = $2, 
		    email_verification_token = $3, 
		    email_verification_expires = $4,
		    updated_at = $5
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		userID,
		verified,
		token,
		expires,
		time.Now(),
	)
	return err
}

// GetUserByEmailVerificationToken retrieves a user by email verification token
func (r *UserRepository) GetUserByEmailVerificationToken(ctx context.Context, token string) (*User, error) {
	query := `
		SELECT id, email, username, password_hash, display_name, avatar_url, bio, 
		       email_verified, email_verification_token, email_verification_expires,
		       password_reset_token, password_reset_expires, created_at, updated_at
		FROM users
		WHERE email_verification_token = $1 
		  AND (email_verification_expires IS NULL OR email_verification_expires > NOW())
	`
	user := &User{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpires,
		&user.PasswordResetToken,
		&user.PasswordResetExpires,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	return user, err
}

// GetUserByPasswordResetToken retrieves a user by password reset token
func (r *UserRepository) GetUserByPasswordResetToken(ctx context.Context, token string) (*User, error) {
	query := `
		SELECT id, email, username, password_hash, display_name, avatar_url, bio, 
		       email_verified, email_verification_token, email_verification_expires,
		       password_reset_token, password_reset_expires, created_at, updated_at
		FROM users
		WHERE password_reset_token = $1 
		  AND (password_reset_expires IS NULL OR password_reset_expires > NOW())
	`
	user := &User{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.Bio,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpires,
		&user.PasswordResetToken,
		&user.PasswordResetExpires,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	return user, err
}

// UpdatePasswordResetToken updates password reset token for a user
func (r *UserRepository) UpdatePasswordResetToken(ctx context.Context, userID string, token *string, expires *time.Time) error {
	query := `
		UPDATE users
		SET password_reset_token = $2, 
		    password_reset_expires = $3,
		    updated_at = $4
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		userID,
		token,
		expires,
		time.Now(),
	)
	return err
}

// UpdatePassword updates a user's password
func (r *UserRepository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $2, 
		    password_reset_token = NULL,
		    password_reset_expires = NULL,
		    updated_at = $3
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		userID,
		passwordHash,
		time.Now(),
	)
	return err
}
