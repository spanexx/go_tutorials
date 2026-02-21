// Package service implements business logic for comment operations
package service

import (
	"context"
	"database/sql"
	"errors"
	"html"
	"sort"
	"strings"

	"github.com/socialhub/auth-service/pkg/models"
)

var (
	ErrCommentNotFound      = errors.New("comment not found")
	ErrCommentDepthExceeded = errors.New("comment depth limit exceeded (max 5 levels)")
	ErrUnauthorizedComment  = errors.New("unauthorized: can only delete your own comments")
)

const (
	MaxCommentDepth  = 5
	MaxCommentLength = 2000
)

// CommentService handles business logic for comment operations
type CommentService struct {
	db *sql.DB
}

// NewCommentService creates a new CommentService instance
func NewCommentService(db *sql.DB) *CommentService {
	return &CommentService{
		db: db,
	}
}

// AddCommentInput represents input for adding a comment
type AddCommentInput struct {
	PostID   string
	UserID   string
	ParentID string // Optional for nested replies
	Content  string
}

// AddComment adds a new comment to a post
func (s *CommentService) AddComment(ctx context.Context, input AddCommentInput) (*models.Comment, error) {
	// Validate content
	if err := validateCommentContent(input.Content); err != nil {
		return nil, err
	}

	// Sanitize content
	sanitizedContent := sanitizeCommentContent(input.Content)

	// Check comment depth if it's a reply
	if input.ParentID != "" {
		depth, err := s.getCommentDepth(ctx, input.ParentID)
		if err != nil {
			return nil, err
		}
		if depth >= MaxCommentDepth {
			return nil, ErrCommentDepthExceeded
		}
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

	parentID := sql.NullString{Valid: false}
	if input.ParentID != "" {
		parentID = sql.NullString{String: input.ParentID, Valid: true}
	}

	comment := &models.Comment{}
	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO comments (post_id, user_id, parent_id, content)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, post_id, user_id, parent_id, content, likes_count, replies_count, is_edited, edited_at, created_at, updated_at, deleted_at`,
		input.PostID,
		input.UserID,
		parentID,
		sanitizedContent,
	).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.UserID,
		&comment.ParentID,
		&comment.Content,
		&comment.LikesCount,
		&comment.RepliesCount,
		&comment.IsEdited,
		&comment.EditedAt,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.ExecContext(
		ctx,
		`UPDATE posts SET comments_count = comments_count + 1, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		input.PostID,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return comment, nil
}

// GetCommentsInput represents input for getting comments
type GetCommentsInput struct {
	PostID string
	Limit  int32
	Offset int32
}

func (s *CommentService) CountTopLevelCommentsByPostID(ctx context.Context, postID string) (int64, error) {
	if postID == "" {
		return 0, errors.New("post ID is required")
	}

	var count int64
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM comments WHERE post_id = $1 AND parent_id IS NULL AND deleted_at IS NULL`,
		postID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// GetComments retrieves top-level comments for a post
func (s *CommentService) GetComments(ctx context.Context, input GetCommentsInput) ([]models.CommentWithDetails, error) {
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			c.id, c.post_id, c.user_id, c.parent_id, c.content,
			c.likes_count, c.replies_count, c.is_edited, c.edited_at,
			c.created_at, c.updated_at, c.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
		`,
		input.PostID,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := make([]models.CommentWithDetails, 0)
	for rows.Next() {
		cmt, err := scanCommentWithUser(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, *cmt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

// GetComment retrieves a single comment by ID
func (s *CommentService) GetComment(ctx context.Context, commentID string) (*models.CommentWithDetails, error) {
	if commentID == "" {
		return nil, errors.New("comment ID is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	row := s.db.QueryRowContext(
		ctx,
		`
		SELECT
			c.id, c.post_id, c.user_id, c.parent_id, c.content,
			c.likes_count, c.replies_count, c.is_edited, c.edited_at,
			c.created_at, c.updated_at, c.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.id = $1 AND c.deleted_at IS NULL
		`,
		commentID,
	)

	cmt, err := scanCommentWithUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCommentNotFound
		}
		return nil, err
	}

	return cmt, nil
}

// GetCommentTree retrieves the full comment tree for a post with nested replies
func (s *CommentService) GetCommentTree(ctx context.Context, postID string, limit, offset int32) ([]models.CommentWithDetails, error) {
	if postID == "" {
		return nil, errors.New("post ID is required")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			c.id, c.post_id, c.user_id, c.parent_id, c.content,
			c.likes_count, c.replies_count, c.is_edited, c.edited_at,
			c.created_at, c.updated_at, c.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.post_id = $1 AND c.deleted_at IS NULL
		ORDER BY c.created_at ASC
		`,
		postID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	all := make([]*models.CommentWithDetails, 0)
	byID := make(map[string]*models.CommentWithDetails)
	for rows.Next() {
		cmt, err := scanCommentWithUser(rows)
		if err != nil {
			return nil, err
		}
		byID[cmt.ID] = cmt
		all = append(all, cmt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Attach replies.
	topLevel := make([]*models.CommentWithDetails, 0)
	for _, cmt := range all {
		if cmt.ParentID.Valid {
			if parent, ok := byID[cmt.ParentID.String]; ok {
				parent.Replies = append(parent.Replies, *cmt)
				continue
			}
		}
		topLevel = append(topLevel, cmt)
	}

	// Ensure deterministic ordering of top-level and nested replies.
	sort.Slice(topLevel, func(i, j int) bool { return topLevel[i].CreatedAt.After(topLevel[j].CreatedAt) })
	for _, tl := range topLevel {
		sort.Slice(tl.Replies, func(i, j int) bool { return tl.Replies[i].CreatedAt.Before(tl.Replies[j].CreatedAt) })
	}

	start := int(offset)
	if start > len(topLevel) {
		return []models.CommentWithDetails{}, nil
	}
	end := start + int(limit)
	if end > len(topLevel) {
		end = len(topLevel)
	}

	result := make([]models.CommentWithDetails, 0, end-start)
	for _, tl := range topLevel[start:end] {
		result = append(result, *tl)
	}

	return result, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCommentWithUser(r rowScanner) (*models.CommentWithDetails, error) {
	var cmt models.CommentWithDetails
	var username, displayName, avatarURL string
	var isVerified bool

	err := r.Scan(
		&cmt.ID,
		&cmt.PostID,
		&cmt.UserID,
		&cmt.ParentID,
		&cmt.Content,
		&cmt.LikesCount,
		&cmt.RepliesCount,
		&cmt.IsEdited,
		&cmt.EditedAt,
		&cmt.CreatedAt,
		&cmt.UpdatedAt,
		&cmt.DeletedAt,
		&username,
		&displayName,
		&avatarURL,
		&isVerified,
	)
	if err != nil {
		return nil, err
	}

	cmt.UserUsername = username
	cmt.UserName = displayName
	cmt.UserAvatar = avatarURL
	cmt.UserIsVerified = isVerified
	cmt.TotalLikes = int64(cmt.LikesCount)
	cmt.TotalReplies = int64(cmt.RepliesCount)

	return &cmt, nil
}

// GetReplies retrieves replies to a specific comment
func (s *CommentService) GetReplies(ctx context.Context, parentID string, limit, offset int32) ([]models.CommentWithDetails, error) {
	if parentID == "" {
		return nil, errors.New("parent ID is required")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			c.id, c.post_id, c.user_id, c.parent_id, c.content,
			c.likes_count, c.replies_count, c.is_edited, c.edited_at,
			c.created_at, c.updated_at, c.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.parent_id = $1 AND c.deleted_at IS NULL
		ORDER BY c.created_at ASC
		LIMIT $2 OFFSET $3
		`,
		parentID,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	replies := make([]models.CommentWithDetails, 0)
	for rows.Next() {
		cmt, err := scanCommentWithUser(rows)
		if err != nil {
			return nil, err
		}
		replies = append(replies, *cmt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return replies, nil
}

// DeleteCommentInput represents input for deleting a comment
type DeleteCommentInput struct {
	CommentID string
	UserID    string
}

// DeleteComment soft deletes a comment
func (s *CommentService) DeleteComment(ctx context.Context, input DeleteCommentInput) error {
	if input.CommentID == "" {
		return errors.New("comment ID is required")
	}
	if input.UserID == "" {
		return errors.New("user ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var postID string
	var parentID sql.NullString

	err = tx.QueryRowContext(
		ctx,
		`UPDATE comments
		 SET deleted_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
		 RETURNING post_id, parent_id`,
		input.CommentID,
		input.UserID,
	).Scan(&postID, &parentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrUnauthorizedComment
		}
		return err
	}

	// Decrement post comment count.
	_, err = tx.ExecContext(
		ctx,
		`UPDATE posts
		 SET comments_count = GREATEST(comments_count - 1, 0), updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL`,
		postID,
	)
	if err != nil {
		return err
	}

	// If this was a reply, decrement parent reply count.
	if parentID.Valid {
		_, err = tx.ExecContext(
			ctx,
			`UPDATE comments
			 SET replies_count = GREATEST(replies_count - 1, 0), updated_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL`,
			parentID.String,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UpdateCommentInput represents input for updating a comment
type UpdateCommentInput struct {
	CommentID string
	UserID    string
	Content   string
}

// UpdateComment updates a comment's content
func (s *CommentService) UpdateComment(ctx context.Context, input UpdateCommentInput) (*models.Comment, error) {
	// Validate content
	if err := validateCommentContent(input.Content); err != nil {
		return nil, err
	}

	if input.CommentID == "" {
		return nil, errors.New("comment ID is required")
	}
	if input.UserID == "" {
		return nil, errors.New("user ID is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	sanitizedContent := sanitizeCommentContent(input.Content)

	updated := &models.Comment{}
	err := s.db.QueryRowContext(
		ctx,
		`UPDATE comments
		 SET content = $1, is_edited = true, edited_at = NOW(), updated_at = NOW()
		 WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
		 RETURNING id, post_id, user_id, parent_id, content, likes_count, replies_count, is_edited, edited_at, created_at, updated_at, deleted_at`,
		sanitizedContent,
		input.CommentID,
		input.UserID,
	).Scan(
		&updated.ID,
		&updated.PostID,
		&updated.UserID,
		&updated.ParentID,
		&updated.Content,
		&updated.LikesCount,
		&updated.RepliesCount,
		&updated.IsEdited,
		&updated.EditedAt,
		&updated.CreatedAt,
		&updated.UpdatedAt,
		&updated.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUnauthorizedComment
		}
		return nil, err
	}

	return updated, nil
}

// getCommentDepth calculates the depth of a comment in the thread
func (s *CommentService) getCommentDepth(ctx context.Context, commentID string) (int, error) {
	if commentID == "" {
		return 0, errors.New("comment ID is required")
	}
	if s.db == nil {
		return 0, errors.New("database not configured")
	}

	var depth int
	err := s.db.QueryRowContext(
		ctx,
		`
		WITH RECURSIVE chain AS (
			SELECT id, parent_id, 0 AS depth
			FROM comments
			WHERE id = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT c.id, c.parent_id, chain.depth + 1
			FROM comments c
			JOIN chain ON chain.parent_id = c.id
			WHERE c.deleted_at IS NULL
		)
		SELECT COALESCE(MAX(depth), 0) FROM chain
		`,
		commentID,
	).Scan(&depth)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCommentNotFound
		}
		return 0, err
	}

	return depth, nil
}

// validateCommentContent validates comment content
func validateCommentContent(content string) error {
	if content == "" {
		return errors.New("content cannot be empty")
	}

	if len(content) > MaxCommentLength {
		return errors.New("content exceeds maximum length of 2000 characters")
	}

	// Basic XSS detection
	xssPatterns := []string{
		`<script[^>]*>`,
		`javascript:`,
		`on\w+\s*=`,
	}

	for _, pattern := range xssPatterns {
		if strings.Contains(strings.ToLower(content), pattern) {
			return errors.New("potentially unsafe content detected")
		}
	}

	return nil
}

// sanitizeCommentContent sanitizes comment content
func sanitizeCommentContent(content string) string {
	return html.EscapeString(strings.TrimSpace(content))
}

// IncrementCommentLikes increments the like count for a comment
func (s *CommentService) IncrementCommentLikes(ctx context.Context, commentID string) error {
	if commentID == "" {
		return errors.New("comment ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE comments SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		commentID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrCommentNotFound
	}
	return nil
}

// DecrementCommentLikes decrements the like count for a comment
func (s *CommentService) DecrementCommentLikes(ctx context.Context, commentID string) error {
	if commentID == "" {
		return errors.New("comment ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		commentID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrCommentNotFound
	}
	return nil
}

// IncrementReplyCount increments the reply count for a comment
func (s *CommentService) IncrementReplyCount(ctx context.Context, commentID string) error {
	if commentID == "" {
		return errors.New("comment ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE comments SET replies_count = replies_count + 1, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		commentID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrCommentNotFound
	}
	return nil
}

// DecrementReplyCount decrements the reply count for a comment
func (s *CommentService) DecrementReplyCount(ctx context.Context, commentID string) error {
	if commentID == "" {
		return errors.New("comment ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE comments SET replies_count = GREATEST(replies_count - 1, 0), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		commentID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrCommentNotFound
	}
	return nil
}
