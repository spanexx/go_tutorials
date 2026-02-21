// Package service implements business logic for follow operations
package service

import (
	"context"
	"database/sql"
	"errors"

	"github.com/socialhub/auth-service/pkg/models"
)

var (
	ErrSelfFollow       = errors.New("cannot follow yourself")
	ErrAlreadyFollowing = errors.New("already following this user")
	ErrNotFollowing     = errors.New("not following this user")
)

// FollowService handles business logic for follow operations
type FollowService struct {
	db *sql.DB
}

// NewFollowService creates a new FollowService instance
func NewFollowService(db *sql.DB) *FollowService {
	return &FollowService{
		db: db,
	}
}

// FollowUserInput represents input for following a user
type FollowUserInput struct {
	FollowerID  string
	FollowingID string
}

// FollowUser creates a follow relationship
func (s *FollowService) FollowUser(ctx context.Context, input FollowUserInput) (*models.Follow, error) {
	// Prevent self-following
	if input.FollowerID == input.FollowingID {
		return nil, ErrSelfFollow
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var existingID string
	var existingDeletedAt sql.NullTime
	err = tx.QueryRowContext(
		ctx,
		`SELECT id, deleted_at FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
		input.FollowerID,
		input.FollowingID,
	).Scan(&existingID, &existingDeletedAt)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	follow := &models.Follow{}
	if err == nil {
		if !existingDeletedAt.Valid {
			return nil, ErrAlreadyFollowing
		}

		err = tx.QueryRowContext(
			ctx,
			`UPDATE follows SET deleted_at = NULL, created_at = NOW() WHERE id = $1 RETURNING id, follower_id, following_id, created_at`,
			existingID,
		).Scan(&follow.ID, &follow.FollowerID, &follow.FollowingID, &follow.CreatedAt)
		if err != nil {
			return nil, err
		}
	} else {
		err = tx.QueryRowContext(
			ctx,
			`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING id, follower_id, following_id, created_at`,
			input.FollowerID,
			input.FollowingID,
		).Scan(&follow.ID, &follow.FollowerID, &follow.FollowingID, &follow.CreatedAt)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return follow, nil
}

// UnfollowUserInput represents input for unfollowing a user
type UnfollowUserInput struct {
	FollowerID  string
	FollowingID string
}

// UnfollowUser removes a follow relationship
func (s *FollowService) UnfollowUser(ctx context.Context, input UnfollowUserInput) error {
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE follows SET deleted_at = NOW() WHERE follower_id = $1 AND following_id = $2 AND deleted_at IS NULL`,
		input.FollowerID,
		input.FollowingID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFollowing
	}
	return nil
}

// ToggleFollow toggles follow status (follow if not following, unfollow if following)
func (s *FollowService) ToggleFollow(ctx context.Context, followerID, followingID string) (followed bool, err error) {
	// Prevent self-following
	if followerID == followingID {
		return false, ErrSelfFollow
	}

	// Check if already following
	isFollowing, err := s.IsFollowing(ctx, followerID, followingID)
	if err != nil {
		return false, err
	}

	if isFollowing {
		err = s.UnfollowUser(ctx, UnfollowUserInput{
			FollowerID:  followerID,
			FollowingID: followingID,
		})
		return false, err
	} else {
		_, err = s.FollowUser(ctx, FollowUserInput{
			FollowerID:  followerID,
			FollowingID: followingID,
		})
		return true, err
	}
}

// IsFollowing checks if a user is following another user
func (s *FollowService) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	if s.db == nil {
		return false, errors.New("database not configured")
	}

	var exists bool
	err := s.db.QueryRowContext(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 AND deleted_at IS NULL)`,
		followerID,
		followingID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// GetFollowersInput represents input for getting followers
type GetFollowersInput struct {
	UserID string
	Limit  int32
	Offset int32
}

// CountFollowers returns the total number of followers for a user
func (s *FollowService) CountFollowers(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM follows WHERE following_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetFollowers retrieves users who follow a specific user (paginated)
func (s *FollowService) GetFollowers(ctx context.Context, input GetFollowersInput) ([]models.FollowWithUser, error) {
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT 
			f.id, f.follower_id, f.following_id, f.created_at,
			u.username, u.display_name, u.avatar_url, u.is_verified
		FROM follows f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = $1 AND f.deleted_at IS NULL
		ORDER BY f.created_at DESC
		LIMIT $2 OFFSET $3
		`,
		input.UserID,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	followers := []models.FollowWithUser{}
	for rows.Next() {
		var f models.Follow
		var uName, uDisplay, uAvatar string
		var uVerified bool
		if err := rows.Scan(
			&f.ID, &f.FollowerID, &f.FollowingID, &f.CreatedAt,
			&uName, &uDisplay, &uAvatar, &uVerified,
		); err != nil {
			return nil, err
		}
		followers = append(followers, models.FollowWithUser{
			Follow:          f,
			UserName:        uName,
			UserUsername:    uName,
			UserAvatar:      uAvatar,
			UserIsVerified:  uVerified,
			IsFollowingBack: false,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return followers, nil
}

// GetFollowingInput represents input for getting following
type GetFollowingInput struct {
	UserID string
	Limit  int32
	Offset int32
}

// CountFollowing returns the total number of users a user follows
func (s *FollowService) CountFollowing(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetFollowing retrieves users that a specific user follows (paginated)
func (s *FollowService) GetFollowing(ctx context.Context, input GetFollowingInput) ([]models.FollowWithUser, error) {
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT 
			f.id, f.follower_id, f.following_id, f.created_at,
			u.username, u.display_name, u.avatar_url, u.is_verified
		FROM follows f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = $1 AND f.deleted_at IS NULL
		ORDER BY f.created_at DESC
		LIMIT $2 OFFSET $3
		`,
		input.UserID,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	following := []models.FollowWithUser{}
	for rows.Next() {
		var f models.Follow
		var uName, uDisplay, uAvatar string
		var uVerified bool
		if err := rows.Scan(
			&f.ID, &f.FollowerID, &f.FollowingID, &f.CreatedAt,
			&uName, &uDisplay, &uAvatar, &uVerified,
		); err != nil {
			return nil, err
		}
		following = append(following, models.FollowWithUser{
			Follow:          f,
			UserName:        uName,
			UserUsername:    uName,
			UserAvatar:      uAvatar,
			UserIsVerified:  uVerified,
			IsFollowingBack: false,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return following, nil
}

// GetFollowCounts retrieves both follower and following counts for a user
type FollowCounts struct {
	Followers int64 `json:"followers"`
	Following int64 `json:"following"`
}

// GetFollowCounts retrieves follow counts for a user
func (s *FollowService) GetFollowCounts(ctx context.Context, userID string) (*FollowCounts, error) {
	followers, err := s.CountFollowers(ctx, userID)
	if err != nil {
		return nil, err
	}

	following, err := s.CountFollowing(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &FollowCounts{
		Followers: followers,
		Following: following,
	}, nil
}

// GetMutualFollowsInput represents input for getting mutual follows
type GetMutualFollowsInput struct {
	UserID1 string
	UserID2 string
	Limit   int32
	Offset  int32
}

// GetMutualFollows retrieves users that both users follow (mutual follows)
func (s *FollowService) GetMutualFollows(ctx context.Context, input GetMutualFollowsInput) ([]models.FollowWithUser, error) {
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}
	if input.Offset < 0 {
		input.Offset = 0
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			f1.id, f1.follower_id, f1.following_id, f1.created_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified
		FROM follows f1
		JOIN follows f2 ON f2.following_id = f1.following_id
		JOIN users u ON u.id = f1.following_id
		WHERE f1.follower_id = $1
			AND f2.follower_id = $2
			AND f1.deleted_at IS NULL
			AND f2.deleted_at IS NULL
		ORDER BY f1.created_at DESC
		LIMIT $3 OFFSET $4
		`,
		input.UserID1,
		input.UserID2,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	mutual := make([]models.FollowWithUser, 0)
	for rows.Next() {
		var f models.Follow
		var username, displayName, avatarURL string
		var verified bool
		if err := rows.Scan(
			&f.ID, &f.FollowerID, &f.FollowingID, &f.CreatedAt,
			&username, &displayName, &avatarURL, &verified,
		); err != nil {
			return nil, err
		}
		mutual = append(mutual, models.FollowWithUser{
			Follow:          f,
			UserName:        displayName,
			UserUsername:    username,
			UserAvatar:      avatarURL,
			UserIsVerified:  verified,
			IsFollowingBack: false,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return mutual, nil
}

// GetFollowSuggestionsInput represents input for getting follow suggestions
type GetFollowSuggestionsInput struct {
	UserID string
	Limit  int32
}

// GetFollowSuggestions retrieves suggested users to follow based on network
func (s *FollowService) GetFollowSuggestions(ctx context.Context, input GetFollowSuggestionsInput) ([]models.FollowWithUser, error) {
	if input.Limit <= 0 {
		input.Limit = 10
	}
	if input.Limit > 50 {
		input.Limit = 50
	}

	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		WITH my_following AS (
			SELECT following_id
			FROM follows
			WHERE follower_id = $1 AND deleted_at IS NULL
		), second_degree AS (
			SELECT f.following_id AS user_id, COUNT(*)::int AS score
			FROM follows f
			JOIN my_following mf ON mf.following_id = f.follower_id
			WHERE f.deleted_at IS NULL
			GROUP BY f.following_id
		)
		SELECT u.id, u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified, sd.score
		FROM second_degree sd
		JOIN users u ON u.id = sd.user_id
		WHERE sd.user_id <> $1
			AND sd.user_id NOT IN (SELECT following_id FROM my_following)
		ORDER BY sd.score DESC, u.username ASC
		LIMIT $2
		`,
		input.UserID,
		input.Limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	suggestions := make([]models.FollowWithUser, 0)
	for rows.Next() {
		var userID, username, displayName, avatarURL string
		var verified bool
		var _score int
		if err := rows.Scan(&userID, &username, &displayName, &avatarURL, &verified, &_score); err != nil {
			return nil, err
		}
		suggestions = append(suggestions, models.FollowWithUser{
			Follow: models.Follow{
				FollowerID:  input.UserID,
				FollowingID: userID,
			},
			UserName:        displayName,
			UserUsername:    username,
			UserAvatar:      avatarURL,
			UserIsVerified:  verified,
			IsFollowingBack: false,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return suggestions, nil
}

// IsFollowedBy checks if a user is followed by another user
func (s *FollowService) IsFollowedBy(ctx context.Context, followerID, followingID string) (bool, error) {
	// This checks the reverse relationship - if followingID follows followerID
	return s.IsFollowing(ctx, followingID, followerID)
}

// GetFollowRelationship retrieves the follow relationship between two users
type FollowRelationship struct {
	IsFollowing    bool `json:"is_following"`     // Current user follows target
	IsFollowedBy   bool `json:"is_followed_by"`   // Target follows current user
	IsMutualFollow bool `json:"is_mutual_follow"` // Both follow each other
}

// GetFollowRelationship retrieves the relationship between two users
func (s *FollowService) GetFollowRelationship(ctx context.Context, followerID, followingID string) (*FollowRelationship, error) {
	isFollowing, err := s.IsFollowing(ctx, followerID, followingID)
	if err != nil {
		return nil, err
	}

	isFollowedBy, err := s.IsFollowedBy(ctx, followerID, followingID)
	if err != nil {
		return nil, err
	}

	return &FollowRelationship{
		IsFollowing:    isFollowing,
		IsFollowedBy:   isFollowedBy,
		IsMutualFollow: isFollowing && isFollowedBy,
	}, nil
}
