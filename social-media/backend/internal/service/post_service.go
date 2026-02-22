// Package service implements business logic for post operations
package service

import (
	"context"
	"database/sql"
	"errors"
	"html"
	"regexp"
	"strings"
	"time"

	"github.com/socialhub/auth-service/pkg/models"
)

var (
	ErrPostNotFound    = errors.New("post not found")
	ErrUnauthorized    = errors.New("unauthorized: can only update/delete your own posts")
	ErrContentTooLong  = errors.New("content exceeds maximum length of 5000 characters")
	ErrEmptyContent    = errors.New("content cannot be empty")
	ErrXSSDetected     = errors.New("potentially unsafe content detected")
	ErrInvalidFeedType = errors.New("invalid feed type")
)

const (
	MaxContentLength = 5000
	DefaultLimit     = 20
	DefaultOffset    = 0
	MaxLimit         = 100
)

// FeedType represents the type of feed to retrieve
type FeedType string

const (
	FeedTypeHome     FeedType = "home"     // Posts from followed users
	FeedTypeTrending FeedType = "trending" // Trending posts
	FeedTypeLatest   FeedType = "latest"   // Latest posts from all users
)

// PostService handles business logic for post operations
type PostService struct {
	db *sql.DB
}

// CountPostsByHashtag returns total count of posts for a hashtag
func (s *PostService) CountPostsByHashtag(ctx context.Context, hashtag string) (int64, error) {
	if hashtag == "" {
		return 0, errors.New("hashtag is required")
	}
	if s.db == nil {
		return 0, nil
	}

	var count int64
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(DISTINCT p.id)
		 FROM posts p
		 JOIN post_hashtags ph ON ph.post_id = p.id
		 WHERE ph.hashtag = $1 AND p.deleted_at IS NULL`,
		hashtag,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetPostsByHashtagWithDetails retrieves posts with a specific hashtag including author details
func (s *PostService) GetPostsByHashtagWithDetails(ctx context.Context, input GetPostsByHashtagInput) ([]models.PostWithDetails, error) {
	if input.Tag == "" {
		return nil, errors.New("hashtag is required")
	}
	if input.Limit <= 0 {
		input.Limit = DefaultLimit
	}
	if input.Limit > MaxLimit {
		input.Limit = MaxLimit
	}
	if input.Offset < 0 {
		input.Offset = 0
	}
	if s.db == nil {
		return []models.PostWithDetails{}, nil
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			p.id, p.user_id, p.content, p.image_url, p.video_url,
			p.likes_count, p.comments_count, p.shares_count, p.views_count,
			p.is_edited, p.edited_at, p.created_at, p.updated_at, p.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified,
			(SELECT type FROM reactions WHERE post_id = p.id AND user_id = $2 AND deleted_at IS NULL LIMIT 1) AS user_reaction
		FROM posts p
		JOIN post_hashtags ph ON ph.post_id = p.id
		JOIN users u ON u.id = p.user_id
		WHERE ph.hashtag = $1 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $3 OFFSET $4
		`,
		input.Tag,
		input.UserID,
		input.Limit,
		input.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.PostWithDetails, 0)
	for rows.Next() {
		p := models.PostWithDetails{}
		var username, displayName, avatarURL string
		var verified bool
		var userReaction sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Content,
			&p.ImageURL,
			&p.VideoURL,
			&p.LikesCount,
			&p.CommentsCount,
			&p.SharesCount,
			&p.ViewsCount,
			&p.IsEdited,
			&p.EditedAt,
			&p.CreatedAt,
			&p.UpdatedAt,
			&p.DeletedAt,
			&username,
			&displayName,
			&avatarURL,
			&verified,
			&userReaction,
		); err != nil {
			return nil, err
		}

		p.UserUsername = username
		p.UserName = displayName
		p.UserAvatar = avatarURL
		p.UserIsVerified = verified
		p.TotalLikes = int64(p.LikesCount)
		p.TotalComments = int64(p.CommentsCount)
		p.TotalShares = int64(p.SharesCount)
		if userReaction.Valid {
			p.UserReaction = userReaction.String
		}

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

// NewPostService creates a new PostService instance
func NewPostService(db *sql.DB) *PostService {
	return &PostService{
		db: db,
	}
}

// IncrementShareCount increments shares_count for a post
func (s *PostService) IncrementShareCount(ctx context.Context, postID string) error {
	if postID == "" {
		return errors.New("post ID is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE posts SET shares_count = shares_count + 1, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		postID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPostNotFound
	}
	return nil
}

// CountPostsByUser returns total count of posts for a user.
func (s *PostService) CountPostsByUser(ctx context.Context, userID string) (int64, error) {
	if userID == "" {
		return 0, errors.New("user ID is required")
	}
	if s.db == nil {
		return 0, nil
	}

	var count int64
	if err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&count); err != nil {
		return 0, err
	}

	return count, nil
}

// GetPostsByUserWithDetails retrieves posts by a specific user including author details.
// viewerUserID is optional and is used for computing the viewer's reaction.
func (s *PostService) GetPostsByUserWithDetails(ctx context.Context, viewerUserID, targetUserID string, limit, offset int32) ([]models.PostWithDetails, error) {
	if targetUserID == "" {
		return nil, errors.New("user ID is required")
	}
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	if offset < 0 {
		offset = DefaultOffset
	}
	if s.db == nil {
		return []models.PostWithDetails{}, nil
	}

	rows, err := s.db.QueryContext(
		ctx,
		`
		SELECT
			p.id, p.user_id, p.content, p.image_url, p.video_url,
			p.likes_count, p.comments_count, p.shares_count, p.views_count,
			p.is_edited, p.edited_at, p.created_at, p.updated_at, p.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified,
			(SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1 AND deleted_at IS NULL LIMIT 1) AS user_reaction
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE p.user_id = $2 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $3 OFFSET $4
		`,
		viewerUserID,
		targetUserID,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.PostWithDetails, 0)
	for rows.Next() {
		p := models.PostWithDetails{}
		var username, displayName, avatarURL string
		var verified bool
		var userReaction sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Content,
			&p.ImageURL,
			&p.VideoURL,
			&p.LikesCount,
			&p.CommentsCount,
			&p.SharesCount,
			&p.ViewsCount,
			&p.IsEdited,
			&p.EditedAt,
			&p.CreatedAt,
			&p.UpdatedAt,
			&p.DeletedAt,
			&username,
			&displayName,
			&avatarURL,
			&verified,
			&userReaction,
		); err != nil {
			return nil, err
		}

		p.UserUsername = username
		p.UserName = displayName
		p.UserAvatar = avatarURL
		p.UserIsVerified = verified
		p.TotalLikes = int64(p.LikesCount)
		p.TotalComments = int64(p.CommentsCount)
		p.TotalShares = int64(p.SharesCount)
		if userReaction.Valid {
			p.UserReaction = userReaction.String
		}

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetPostsByHashtagInput represents input for getting posts by hashtag
type GetPostsByHashtagInput struct {
	UserID string
	Tag    string
	Limit  int32
	Offset int32
}

// CreatePostInput represents input for creating a post
type CreatePostInput struct {
	UserID   string
	Content  string
	ImageURL string
	VideoURL string
}

// CreatePost creates a new post
func (s *PostService) CreatePost(ctx context.Context, input CreatePostInput) (*models.Post, error) {
	// Validate content
	if err := validateContent(input.Content); err != nil {
		return nil, err
	}

	// Sanitize content
	sanitizedContent := sanitizeContent(input.Content)

	// Extract hashtags and mentions
	hashtags := extractHashtags(sanitizedContent)
	_ = hashtags
	mentions := extractMentions(sanitizedContent)
	_ = mentions

	if s.db == nil {
		post := &models.Post{
			UserID:   input.UserID,
			Content:  sanitizedContent,
			ImageURL: nullString(input.ImageURL),
			VideoURL: nullString(input.VideoURL),
		}
		return post, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	post := &models.Post{}
	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO posts (user_id, content, image_url, video_url)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, content, image_url, video_url, likes_count, comments_count, shares_count, views_count, is_edited, edited_at, created_at, updated_at, deleted_at`,
		input.UserID,
		sanitizedContent,
		nullString(input.ImageURL),
		nullString(input.VideoURL),
	).Scan(
		&post.ID,
		&post.UserID,
		&post.Content,
		&post.ImageURL,
		&post.VideoURL,
		&post.LikesCount,
		&post.CommentsCount,
		&post.SharesCount,
		&post.ViewsCount,
		&post.IsEdited,
		&post.EditedAt,
		&post.CreatedAt,
		&post.UpdatedAt,
		&post.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	for _, tag := range hashtags {
		_, err := tx.ExecContext(
			ctx,
			`INSERT INTO post_hashtags (post_id, hashtag) VALUES ($1, $2) ON CONFLICT (post_id, hashtag) DO NOTHING`,
			post.ID,
			strings.TrimPrefix(tag, "#"),
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return post, nil
}

// GetPost retrieves a post by ID
func (s *PostService) GetPost(ctx context.Context, postID, userID string) (*models.PostWithDetails, error) {
	if postID == "" {
		return nil, errors.New("post ID is required")
	}
	if s.db == nil {
		return nil, ErrPostNotFound
	}

	p := &models.PostWithDetails{}
	var username, displayName, avatarURL string
	var verified bool
	var userReaction sql.NullString

	err := s.db.QueryRowContext(
		ctx,
		`
		SELECT
			p.id, p.user_id, p.content, p.image_url, p.video_url,
			p.likes_count, p.comments_count, p.shares_count, p.views_count,
			p.is_edited, p.edited_at, p.created_at, p.updated_at, p.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), u.is_verified,
			(SELECT type FROM reactions WHERE post_id = p.id AND user_id = $2 LIMIT 1) AS user_reaction
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE p.id = $1 AND p.deleted_at IS NULL
		`,
		postID,
		userID,
	).Scan(
		&p.ID,
		&p.UserID,
		&p.Content,
		&p.ImageURL,
		&p.VideoURL,
		&p.LikesCount,
		&p.CommentsCount,
		&p.SharesCount,
		&p.ViewsCount,
		&p.IsEdited,
		&p.EditedAt,
		&p.CreatedAt,
		&p.UpdatedAt,
		&p.DeletedAt,
		&username,
		&displayName,
		&avatarURL,
		&verified,
		&userReaction,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPostNotFound
		}
		return nil, err
	}

	p.UserUsername = username
	p.UserName = displayName
	p.UserAvatar = avatarURL
	p.UserIsVerified = verified
	p.TotalLikes = int64(p.LikesCount)
	p.TotalComments = int64(p.CommentsCount)
	p.TotalShares = int64(p.SharesCount)
	if userReaction.Valid {
		p.UserReaction = userReaction.String
	}

	return p, nil
}

// GetFeedInput represents input for getting feed
type GetFeedInput struct {
	UserID   string
	FeedType FeedType
	Limit    int32
	Offset   int32
}

// GetFeed retrieves posts based on feed type
func (s *PostService) GetFeed(ctx context.Context, input GetFeedInput) ([]models.PostWithDetails, error) {
	if input.Limit <= 0 {
		input.Limit = DefaultLimit
	}
	if input.Limit > MaxLimit {
		input.Limit = MaxLimit
	}
	if input.Offset < 0 {
		input.Offset = DefaultOffset
	}
	if s.db == nil {
		return []models.PostWithDetails{}, nil
	}

	baseSelect := `
		SELECT
			p.id, p.user_id, p.content, p.image_url, p.video_url,
			p.likes_count, p.comments_count, p.shares_count, p.views_count,
			p.is_edited, p.edited_at, p.created_at, p.updated_at, p.deleted_at,
			u.username, u.display_name, COALESCE(u.avatar_url, ''), COALESCE(u.email_verified, false),
			(SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1 LIMIT 1) AS user_reaction
		FROM posts p
		JOIN users u ON u.id = p.user_id
	`

	var query string
	args := []any{input.UserID, input.Limit, input.Offset}

	switch input.FeedType {
	case FeedTypeHome:
		query = baseSelect + `
		JOIN follows f ON f.following_id = p.user_id
		WHERE f.follower_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
		`
	case FeedTypeLatest:
		query = baseSelect + `
		WHERE p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
		`
	case FeedTypeTrending:
		query = baseSelect + `
		WHERE p.deleted_at IS NULL
		ORDER BY (p.likes_count + (p.comments_count * 2)) DESC, p.created_at DESC
		LIMIT $2 OFFSET $3
		`
	default:
		return nil, ErrInvalidFeedType
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.PostWithDetails, 0)
	for rows.Next() {
		p := models.PostWithDetails{}
		var username, displayName, avatarURL string
		var verified bool
		var userReaction sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Content,
			&p.ImageURL,
			&p.VideoURL,
			&p.LikesCount,
			&p.CommentsCount,
			&p.SharesCount,
			&p.ViewsCount,
			&p.IsEdited,
			&p.EditedAt,
			&p.CreatedAt,
			&p.UpdatedAt,
			&p.DeletedAt,
			&username,
			&displayName,
			&avatarURL,
			&verified,
			&userReaction,
		); err != nil {
			return nil, err
		}

		p.UserUsername = username
		p.UserName = displayName
		p.UserAvatar = avatarURL
		p.UserIsVerified = verified
		p.TotalLikes = int64(p.LikesCount)
		p.TotalComments = int64(p.CommentsCount)
		p.TotalShares = int64(p.SharesCount)
		if userReaction.Valid {
			p.UserReaction = userReaction.String
		}

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

// CountFeedPosts returns total count of posts for a given feed type
func (s *PostService) CountFeedPosts(ctx context.Context, feedType FeedType, userID string) (int64, error) {
	if s.db == nil {
		return 0, nil
	}

	var count int64
	var err error

	switch feedType {
	case FeedTypeHome:
		// Count posts from followed users
		err = s.db.QueryRowContext(
			ctx,
			`SELECT COUNT(*) FROM posts p 
			 JOIN follows f ON p.user_id = f.following_id 
			 WHERE f.follower_id = $1 AND p.deleted_at IS NULL`,
			userID,
		).Scan(&count)
	case FeedTypeLatest:
		// Count all posts
		err = s.db.QueryRowContext(
			ctx,
			`SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL`,
		).Scan(&count)
	case FeedTypeTrending:
		// Count trending posts (simplified - all non-deleted posts)
		err = s.db.QueryRowContext(
			ctx,
			`SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL`,
		).Scan(&count)
	default:
		return 0, ErrInvalidFeedType
	}

	if err != nil {
		return 0, err
	}
	return count, nil
}

// UpdatePostInput represents input for updating a post
type UpdatePostInput struct {
	PostID   string
	UserID   string
	Content  string
	ImageURL string
	VideoURL string
}

// UpdatePost updates a post
func (s *PostService) UpdatePost(ctx context.Context, input UpdatePostInput) (*models.Post, error) {
	if input.PostID == "" {
		return nil, errors.New("post ID is required")
	}
	if input.UserID == "" {
		return nil, errors.New("user ID is required")
	}
	if s.db == nil {
		return nil, ErrPostNotFound
	}
	if input.Content != "" {
		if err := validateContent(input.Content); err != nil {
			return nil, err
		}
	}

	content := sql.NullString{Valid: false}
	if input.Content != "" {
		content = sql.NullString{String: sanitizeContent(input.Content), Valid: true}
	}
	image := sql.NullString{Valid: false}
	if input.ImageURL != "" {
		image = sql.NullString{String: input.ImageURL, Valid: true}
	}
	video := sql.NullString{Valid: false}
	if input.VideoURL != "" {
		video = sql.NullString{String: input.VideoURL, Valid: true}
	}

	// Ensure ownership
	var ownerID string
	err := s.db.QueryRowContext(ctx, `SELECT user_id FROM posts WHERE id = $1 AND deleted_at IS NULL`, input.PostID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPostNotFound
		}
		return nil, err
	}
	if ownerID != input.UserID {
		return nil, ErrUnauthorized
	}

	updated := &models.Post{}
	err = s.db.QueryRowContext(
		ctx,
		`UPDATE posts
		 SET content = COALESCE($2, content),
		     image_url = COALESCE($3, image_url),
		     video_url = COALESCE($4, video_url),
		     is_edited = TRUE,
		     edited_at = NOW(),
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id, user_id, content, image_url, video_url, likes_count, comments_count, shares_count, views_count, is_edited, edited_at, created_at, updated_at, deleted_at`,
		input.PostID,
		content,
		image,
		video,
	).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Content,
		&updated.ImageURL,
		&updated.VideoURL,
		&updated.LikesCount,
		&updated.CommentsCount,
		&updated.SharesCount,
		&updated.ViewsCount,
		&updated.IsEdited,
		&updated.EditedAt,
		&updated.CreatedAt,
		&updated.UpdatedAt,
		&updated.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

// DeletePost deletes a post
func (s *PostService) DeletePost(ctx context.Context, postID, userID string) error {
	if postID == "" {
		return errors.New("post ID is required")
	}
	if userID == "" {
		return errors.New("user ID is required")
	}
	if s.db == nil {
		return ErrPostNotFound
	}

	var ownerID string
	err := s.db.QueryRowContext(ctx, `SELECT user_id FROM posts WHERE id = $1 AND deleted_at IS NULL`, postID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrPostNotFound
		}
		return err
	}
	if ownerID != userID {
		return ErrUnauthorized
	}

	res, err := s.db.ExecContext(ctx, `UPDATE posts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, postID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPostNotFound
	}
	return nil
}

// GetPostsByUser retrieves posts by a specific user
func (s *PostService) GetPostsByUser(ctx context.Context, userID string, limit, offset int32) ([]models.Post, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	if offset < 0 {
		offset = DefaultOffset
	}
	if s.db == nil {
		return []models.Post{}, nil
	}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, content, image_url, video_url, likes_count, comments_count, shares_count, views_count, is_edited, edited_at, created_at, updated_at, deleted_at
		 FROM posts
		 WHERE user_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.Post, 0)
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Content, &p.ImageURL, &p.VideoURL,
			&p.LikesCount, &p.CommentsCount, &p.SharesCount, &p.ViewsCount,
			&p.IsEdited, &p.EditedAt, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return posts, nil
}

// GetPostsByHashtag retrieves posts with a specific hashtag
func (s *PostService) GetPostsByHashtag(ctx context.Context, hashtag string, limit, offset int32) ([]models.Post, error) {
	if hashtag == "" {
		return nil, errors.New("hashtag is required")
	}
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	if offset < 0 {
		offset = DefaultOffset
	}
	if s.db == nil {
		return []models.Post{}, nil
	}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT p.id, p.user_id, p.content, p.image_url, p.video_url, p.likes_count, p.comments_count, p.shares_count, p.views_count, p.is_edited, p.edited_at, p.created_at, p.updated_at, p.deleted_at
		 FROM posts p
		 JOIN post_hashtags ph ON ph.post_id = p.id
		 WHERE ph.hashtag = $1 AND p.deleted_at IS NULL
		 ORDER BY p.created_at DESC
		 LIMIT $2 OFFSET $3`,
		hashtag,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.Post, 0)
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Content, &p.ImageURL, &p.VideoURL,
			&p.LikesCount, &p.CommentsCount, &p.SharesCount, &p.ViewsCount,
			&p.IsEdited, &p.EditedAt, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return posts, nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

// validateContent validates post content
func validateContent(content string) error {
	if content == "" {
		return ErrEmptyContent
	}

	if len(content) > MaxContentLength {
		return ErrContentTooLong
	}

	// Basic XSS detection (production would use a proper library)
	xssPatterns := []string{
		`<script[^>]*>`,
		`javascript:`,
		`on\w+\s*=`,
	}

	for _, pattern := range xssPatterns {
		matched, _ := regexp.MatchString(pattern, strings.ToLower(content))
		if matched {
			return ErrXSSDetected
		}
	}

	return nil
}

// sanitizeContent sanitizes post content
func sanitizeContent(content string) string {
	// Escape HTML entities
	return html.EscapeString(strings.TrimSpace(content))
}

// extractHashtags extracts hashtags from content
func extractHashtags(content string) []string {
	re := regexp.MustCompile(`#[a-zA-Z][a-zA-Z0-9_]*`)
	matches := re.FindAllString(content, -1)

	hashtags := make([]string, 0, len(matches))
	seen := make(map[string]bool)

	for _, match := range matches {
		tag := strings.ToLower(strings.TrimPrefix(match, "#"))
		if !seen[tag] {
			seen[tag] = true
			hashtags = append(hashtags, tag)
		}
	}

	return hashtags
}

// extractMentions extracts mentions from content
func extractMentions(content string) []string {
	re := regexp.MustCompile(`@[a-zA-Z0-9_]+`)
	matches := re.FindAllString(content, -1)

	mentions := make([]string, 0, len(matches))
	seen := make(map[string]bool)

	for _, match := range matches {
		username := strings.ToLower(strings.TrimPrefix(match, "@"))
		if !seen[username] {
			seen[username] = true
			mentions = append(mentions, username)
		}
	}

	return mentions
}

// CalculateTrendingScore calculates trending score for a post
// score = likes*1 + comments*2 + recency_boost
func CalculateTrendingScore(likes, comments int32, createdAt time.Time) float64 {
	likesScore := float64(likes) * 1.0
	commentsScore := float64(comments) * 2.0

	// Recency boost: newer posts get higher boost
	// Decay factor: score halves every 24 hours
	hoursSincePost := time.Since(createdAt).Hours()
	recencyBoost := 1.0 / (1.0 + hoursSincePost/24.0)

	return (likesScore + commentsScore) * recencyBoost
}
