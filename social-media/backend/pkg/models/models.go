// Package models defines data models for the socialhub backend
package models

import (
	"database/sql"
	"time"
)

// Post represents a post in the system
type Post struct {
	ID            string         `json:"id"`
	UserID        string         `json:"user_id"`
	Content       string         `json:"content"`
	ImageURL      sql.NullString `json:"image_url,omitempty"`
	VideoURL      sql.NullString `json:"video_url,omitempty"`
	LikesCount    int32          `json:"likes_count"`
	CommentsCount int32          `json:"comments_count"`
	SharesCount   int32          `json:"shares_count"`
	ViewsCount    int32          `json:"views_count"`
	IsEdited      bool           `json:"is_edited"`
	EditedAt      sql.NullTime   `json:"edited_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     sql.NullTime   `json:"-"`
}

// Comment represents a comment on a post
type Comment struct {
	ID          string         `json:"id"`
	PostID      string         `json:"post_id"`
	UserID      string         `json:"user_id"`
	ParentID    sql.NullString `json:"parent_id,omitempty"`
	Content     string         `json:"content"`
	LikesCount  int32          `json:"likes_count"`
	RepliesCount int32         `json:"replies_count"`
	IsEdited    bool           `json:"is_edited"`
	EditedAt    sql.NullTime   `json:"edited_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   sql.NullTime   `json:"-"`
}

// Reaction represents a reaction to a post or comment
type Reaction struct {
	ID        string         `json:"id"`
	PostID    sql.NullString `json:"post_id,omitempty"`
	CommentID sql.NullString `json:"comment_id,omitempty"`
	UserID    string         `json:"user_id"`
	Type      string         `json:"type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt sql.NullTime   `json:"-"`
}

// Follow represents a follow relationship
type Follow struct {
	ID         string    `json:"id"`
	FollowerID string    `json:"follower_id"`
	FollowingID string   `json:"following_id"`
	CreatedAt  time.Time `json:"created_at"`
	DeletedAt  sql.NullTime `json:"-"`
}

// PostWithDetails extends Post with additional details for display
type PostWithDetails struct {
	Post

	// User details
	UserName       string `json:"user_name"`
	UserUsername   string `json:"user_username"`
	UserAvatar     string `json:"user_avatar"`
	UserIsVerified bool   `json:"user_is_verified"`

	// Aggregated counts
	TotalLikes    int64 `json:"total_likes"`
	TotalComments int64 `json:"total_comments"`
	TotalShares   int64 `json:"total_shares"`

	// User's reaction to this post
	UserReaction string `json:"user_reaction,omitempty"`
}

// CommentWithDetails extends Comment with additional details for display
type CommentWithDetails struct {
	Comment

	// User details
	UserName       string `json:"user_name"`
	UserUsername   string `json:"user_username"`
	UserAvatar     string `json:"user_avatar"`
	UserIsVerified bool   `json:"user_is_verified"`

	// Aggregated counts
	TotalLikes   int64 `json:"total_likes"`
	TotalReplies int64 `json:"total_replies"`

	// Nested replies
	Replies []CommentWithDetails `json:"replies,omitempty"`
}

// ReactionWithUser extends Reaction with user details
type ReactionWithUser struct {
	Reaction

	// User details
	UserName     string `json:"user_name"`
	UserUsername string `json:"user_username"`
	UserAvatar   string `json:"user_avatar"`
}

// FollowWithUser extends Follow with user details
type FollowWithUser struct {
	Follow

	// User details
	UserName       string `json:"user_name"`
	UserUsername   string `json:"user_username"`
	UserAvatar     string `json:"user_avatar"`
	UserIsVerified bool   `json:"user_is_verified"`

	// Whether this user follows back
	IsFollowingBack bool `json:"is_following_back"`
}

// FeedResponse represents a paginated feed response
type FeedResponse struct {
	Posts      []PostWithDetails `json:"posts"`
	TotalCount int64             `json:"total_count"`
	HasMore    bool              `json:"has_more"`
	Limit      int32             `json:"limit"`
	Offset     int32             `json:"offset"`
}

// CreatePostRequest represents a request to create a post
type CreatePostRequest struct {
	Content  string `json:"content"`
	ImageURL string `json:"image_url,omitempty"`
	VideoURL string `json:"video_url,omitempty"`
}

// UpdatePostRequest represents a request to update a post
type UpdatePostRequest struct {
	Content  string `json:"content,omitempty"`
	ImageURL string `json:"image_url,omitempty"`
	VideoURL string `json:"video_url,omitempty"`
}

// CreateCommentRequest represents a request to create a comment
type CreateCommentRequest struct {
	PostID   string `json:"post_id"`
	ParentID string `json:"parent_id,omitempty"`
	Content  string `json:"content"`
}

// CreateReactionRequest represents a request to add a reaction
type CreateReactionRequest struct {
	PostID    string `json:"post_id,omitempty"`
	CommentID string `json:"comment_id,omitempty"`
	Type      string `json:"type"`
}

// TrendingScore represents a post with its trending score
type TrendingScore struct {
	PostID string  `json:"post_id"`
	Score  float64 `json:"score"`
}

// HashtagStats represents statistics for a hashtag
type HashtagStats struct {
	Hashtag string `json:"hashtag"`
	Count   int64  `json:"count"`
}

// UserStats represents statistics for a user
type UserStats struct {
	UserID          string    `json:"user_id"`
	PostsCount      int64     `json:"posts_count"`
	FollowersCount  int64     `json:"followers_count"`
	FollowingCount  int64     `json:"following_count"`
	TotalLikes      int64     `json:"total_likes"`
	TotalComments   int64     `json:"total_comments"`
	JoinedAt        time.Time `json:"joined_at"`
}
