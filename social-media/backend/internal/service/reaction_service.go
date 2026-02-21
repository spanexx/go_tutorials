// Package service implements business logic for reaction operations
package service

import (
	"context"
	"database/sql"
	"errors"

	"github.com/socialhub/auth-service/pkg/models"
)

var (
	ErrReactionNotFound    = errors.New("reaction not found")
	ErrInvalidReactionType = errors.New("invalid reaction type")
	ErrReactionExists      = errors.New("reaction already exists")
)

// ValidReactionTypes defines the allowed reaction types
var ValidReactionTypes = map[string]bool{
	"like":  true,
	"love":  true,
	"laugh": true,
	"wow":   true,
	"sad":   true,
	"angry": true,
}

// ReactionService handles business logic for reaction operations
type ReactionService struct {
	db *sql.DB
}

// NewReactionService creates a new ReactionService instance
func NewReactionService(db *sql.DB) *ReactionService {
	return &ReactionService{
		db: db,
	}
}

// ReactInput represents input for adding a reaction
type ReactInput struct {
	PostID    string
	CommentID string
	UserID    string
	Type      string
}

// React adds or toggles a reaction to a post or comment
func (s *ReactionService) React(ctx context.Context, input ReactInput) (*models.Reaction, error) {
	// Validate reaction type
	if !ValidReactionTypes[input.Type] {
		return nil, ErrInvalidReactionType
	}

	// Validate that either PostID or CommentID is provided, not both
	if (input.PostID == "" && input.CommentID == "") || (input.PostID != "" && input.CommentID != "") {
		return nil, errors.New("either post_id or comment_id must be provided, not both")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	// Ensure idempotency without relying on driver-specific unique violation errors.
	var exists bool
	err := s.db.QueryRowContext(
		ctx,
		`SELECT EXISTS(
			SELECT 1
			FROM reactions
			WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
				AND user_id = $3
				AND type = $4
		)`,
		postID,
		commentID,
		input.UserID,
		input.Type,
	).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrReactionExists
	}

	reaction := &models.Reaction{}
	err = s.db.QueryRowContext(
		ctx,
		`INSERT INTO reactions (post_id, comment_id, user_id, type)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, post_id, comment_id, user_id, type, created_at, updated_at`,
		postID,
		commentID,
		input.UserID,
		input.Type,
	).Scan(
		&reaction.ID,
		&reaction.PostID,
		&reaction.CommentID,
		&reaction.UserID,
		&reaction.Type,
		&reaction.CreatedAt,
		&reaction.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return reaction, nil
}

// RemoveReactionInput represents input for removing a reaction
type RemoveReactionInput struct {
	PostID    string
	CommentID string
	UserID    string
	Type      string
}

// RemoveReaction removes a reaction from a post or comment
func (s *ReactionService) RemoveReaction(ctx context.Context, input RemoveReactionInput) error {
	// Validate reaction type
	if !ValidReactionTypes[input.Type] {
		return ErrInvalidReactionType
	}

	if s.db == nil {
		return errors.New("database not configured")
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	result, err := s.db.ExecContext(
		ctx,
		`DELETE FROM reactions
		 WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
		   AND user_id = $3
		   AND type = $4`,
		postID,
		commentID,
		input.UserID,
		input.Type,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrReactionNotFound
	}

	return nil
}

// ToggleReactionInput represents input for toggling a reaction
type ToggleReactionInput struct {
	PostID    string
	CommentID string
	UserID    string
	Type      string
}

// ToggleReaction toggles a reaction (adds if not exists, removes if exists)
func (s *ReactionService) ToggleReaction(ctx context.Context, input ToggleReactionInput) (added bool, err error) {
	// Validate reaction type
	if !ValidReactionTypes[input.Type] {
		return false, ErrInvalidReactionType
	}

	if s.db == nil {
		return false, errors.New("database not configured")
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	// Check if reaction exists
	var exists bool
	err = s.db.QueryRowContext(
		ctx,
		`SELECT EXISTS(
			SELECT 1
			FROM reactions
			WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
				AND user_id = $3
				AND type = $4
		)`,
		postID,
		commentID,
		input.UserID,
		input.Type,
	).Scan(&exists)
	if err != nil {
		return false, err
	}

	if exists {
		// Remove the reaction
		_, err = s.db.ExecContext(
			ctx,
			`DELETE FROM reactions
			 WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
			   AND user_id = $3
			   AND type = $4`,
			postID,
			commentID,
			input.UserID,
			input.Type,
		)
		if err != nil {
			return false, err
		}
		return false, nil
	}

	// Add the reaction
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO reactions (post_id, comment_id, user_id, type)
		 VALUES ($1, $2, $3, $4)`,
		postID,
		commentID,
		input.UserID,
		input.Type,
	)
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetReactionsInput represents input for getting reactions
type GetReactionsInput struct {
	PostID    string
	CommentID string
	Limit     int32
	Offset    int32
}

// GetReactions retrieves reactions for a post or comment
func (s *ReactionService) GetReactions(ctx context.Context, input GetReactionsInput) ([]models.ReactionWithUser, error) {
	if s.db == nil {
		return []models.ReactionWithUser{}, nil
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT r.id, r.post_id, r.comment_id, r.user_id, r.type, r.created_at, r.updated_at,
		        u.display_name, u.username, u.avatar_url
		 FROM reactions r
		 JOIN users u ON r.user_id = u.id
		 WHERE ((r.post_id = $1 AND r.comment_id IS NULL) OR (r.comment_id = $2 AND r.post_id IS NULL))
		 ORDER BY r.created_at DESC
		 LIMIT $3 OFFSET $4`,
		postID,
		commentID,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reactions []models.ReactionWithUser
	for rows.Next() {
		var r models.ReactionWithUser
		err := rows.Scan(
			&r.ID,
			&r.PostID,
			&r.CommentID,
			&r.UserID,
			&r.Type,
			&r.CreatedAt,
			&r.UpdatedAt,
			&r.UserName,
			&r.UserUsername,
			&r.UserAvatar,
		)
		if err != nil {
			return nil, err
		}
		reactions = append(reactions, r)
	}

	return reactions, rows.Err()
}

// GetUserReaction retrieves a user's reaction to a post or comment
func (s *ReactionService) GetUserReaction(ctx context.Context, postID, commentID, userID string) (*models.Reaction, error) {
	if s.db == nil {
		return nil, ErrReactionNotFound
	}

	pid := sql.NullString{String: postID, Valid: postID != ""}
	cid := sql.NullString{String: commentID, Valid: commentID != ""}

	reaction := &models.Reaction{}
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, post_id, comment_id, user_id, type, created_at, updated_at
		 FROM reactions
		 WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
		   AND user_id = $3
		 LIMIT 1`,
		pid,
		cid,
		userID,
	).Scan(
		&reaction.ID,
		&reaction.PostID,
		&reaction.CommentID,
		&reaction.UserID,
		&reaction.Type,
		&reaction.CreatedAt,
		&reaction.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrReactionNotFound
	}
	if err != nil {
		return nil, err
	}

	return reaction, nil
}

// GetReactionCountsInput represents input for getting reaction counts
type GetReactionCountsInput struct {
	PostID    string
	CommentID string
}

// ReactionCounts represents counts for each reaction type
type ReactionCounts struct {
	Like  int64 `json:"like"`
	Love  int64 `json:"love"`
	Laugh int64 `json:"laugh"`
	Wow   int64 `json:"wow"`
	Sad   int64 `json:"sad"`
	Angry int64 `json:"angry"`
	Total int64 `json:"total"`
}

// GetReactionCounts retrieves reaction counts for a post or comment
func (s *ReactionService) GetReactionCounts(ctx context.Context, input GetReactionCountsInput) (*ReactionCounts, error) {
	counts := &ReactionCounts{}

	if s.db == nil {
		return counts, nil
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT type, COUNT(*) as count
		 FROM reactions
		 WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
		 GROUP BY type`,
		postID,
		commentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var reactionType string
		var count int64
		if err := rows.Scan(&reactionType, &count); err != nil {
			return nil, err
		}
		counts.Total += count
		switch reactionType {
		case "like":
			counts.Like = count
		case "love":
			counts.Love = count
		case "laugh":
			counts.Laugh = count
		case "wow":
			counts.Wow = count
		case "sad":
			counts.Sad = count
		case "angry":
			counts.Angry = count
		}
	}

	return counts, rows.Err()
}

// GetTopReactions retrieves the top reactions (most common types) for a post or comment
func (s *ReactionService) GetTopReactions(ctx context.Context, postID, commentID string, limit int) ([]ReactionCount, error) {
	if s.db == nil {
		return []ReactionCount{}, nil
	}

	pid := sql.NullString{String: postID, Valid: postID != ""}
	cid := sql.NullString{String: commentID, Valid: commentID != ""}

	if limit <= 0 {
		limit = 3
	}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT type, COUNT(*) as count
		 FROM reactions
		 WHERE ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
		 GROUP BY type
		 ORDER BY count DESC
		 LIMIT $3`,
		pid,
		cid,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ReactionCount
	for rows.Next() {
		var rc ReactionCount
		if err := rows.Scan(&rc.Type, &rc.Count); err != nil {
			return nil, err
		}
		results = append(results, rc)
	}

	return results, rows.Err()
}

// ReactionCount represents a reaction type with its count
type ReactionCount struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

// ChangeReactionInput represents input for changing a reaction type
type ChangeReactionInput struct {
	PostID    string
	CommentID string
	UserID    string
	OldType   string
	NewType   string
}

// ChangeReaction changes a user's reaction from one type to another
func (s *ReactionService) ChangeReaction(ctx context.Context, input ChangeReactionInput) (*models.Reaction, error) {
	// Validate both reaction types
	if !ValidReactionTypes[input.OldType] || !ValidReactionTypes[input.NewType] {
		return nil, ErrInvalidReactionType
	}

	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	postID := sql.NullString{String: input.PostID, Valid: input.PostID != ""}
	commentID := sql.NullString{String: input.CommentID, Valid: input.CommentID != ""}

	// Update the reaction type atomically
	reaction := &models.Reaction{}
	err := s.db.QueryRowContext(
		ctx,
		`UPDATE reactions
		 SET type = $1, updated_at = NOW()
		 WHERE ((post_id = $2 AND comment_id IS NULL) OR (comment_id = $3 AND post_id IS NULL))
		   AND user_id = $4
		   AND type = $5
		 RETURNING id, post_id, comment_id, user_id, type, created_at, updated_at`,
		input.NewType,
		postID,
		commentID,
		input.UserID,
		input.OldType,
	).Scan(
		&reaction.ID,
		&reaction.PostID,
		&reaction.CommentID,
		&reaction.UserID,
		&reaction.Type,
		&reaction.CreatedAt,
		&reaction.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrReactionNotFound
	}
	if err != nil {
		return nil, err
	}

	return reaction, nil
}

// ValidateReactionType validates if a reaction type is valid
func ValidateReactionType(reactionType string) bool {
	return ValidReactionTypes[reactionType]
}

// GetReactionEmoji returns the emoji for a reaction type
func GetReactionEmoji(reactionType string) string {
	emojis := map[string]string{
		"like":  "👍",
		"love":  "❤️",
		"laugh": "😂",
		"wow":   "😮",
		"sad":   "😢",
		"angry": "😠",
	}
	return emojis[reactionType]
}

// GetReactionLabel returns the display label for a reaction type
func GetReactionLabel(reactionType string) string {
	labels := map[string]string{
		"like":  "Like",
		"love":  "Love",
		"laugh": "Laugh",
		"wow":   "Wow",
		"sad":   "Sad",
		"angry": "Angry",
	}
	return labels[reactionType]
}
