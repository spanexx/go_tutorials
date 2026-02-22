package service

import (
	"context"
	"database/sql"
	"errors"
)

type Bookmark struct {
	ID           string `json:"id"`
	UserID       string `json:"userId"`
	PostID       string `json:"postId"`
	CollectionID string `json:"collectionId"`
	CreatedAt    string `json:"createdAt"`
}

type BookmarkCollection struct {
	ID          string  `json:"id"`
	UserID      string  `json:"userId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Color       string  `json:"color"`
	Icon        string  `json:"icon"`
	IsDefault   bool    `json:"isDefault,omitempty"`
	CreatedAt   string  `json:"createdAt"`
}

type BookmarkService struct {
	db *sql.DB
}

func NewBookmarkService(db *sql.DB) *BookmarkService {
	return &BookmarkService{db: db}
}

type ListBookmarksInput struct {
	UserID string
	Page   int
	Limit  int
}

type ListBookmarksResult struct {
	Bookmarks   []Bookmark `json:"bookmarks"`
	TotalCount  int64      `json:"totalCount"`
	HasMore     bool       `json:"hasMore"`
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
}

func (s *BookmarkService) EnsureDefaultCollection(ctx context.Context, userID string) (string, error) {
	if userID == "" {
		return "", errors.New("user_id is required")
	}
	if s.db == nil {
		return "", errors.New("database not configured")
	}

	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM bookmark_collections WHERE user_id = $1 AND is_default = TRUE LIMIT 1`, userID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	err = s.db.QueryRowContext(ctx, `
		INSERT INTO bookmark_collections (user_id, name, color, icon, is_default)
		VALUES ($1, 'Default', '#3B82F6', 'bookmark', TRUE)
		RETURNING id
	`, userID).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (s *BookmarkService) ListCollections(ctx context.Context, userID string) ([]BookmarkCollection, error) {
	if userID == "" {
		return nil, errors.New("user_id is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	_, _ = s.EnsureDefaultCollection(ctx, userID)

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, name, description, color, icon, is_default, created_at
		FROM bookmark_collections
		WHERE user_id = $1
		ORDER BY is_default DESC, created_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]BookmarkCollection, 0)
	for rows.Next() {
		c := BookmarkCollection{}
		var desc sql.NullString
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &desc, &c.Color, &c.Icon, &c.IsDefault, &c.CreatedAt); err != nil {
			return nil, err
		}
		if desc.Valid {
			v := desc.String
			c.Description = &v
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

type CreateCollectionInput struct {
	UserID      string
	Name        string
	Description *string
	Color       *string
	Icon        *string
}

func (s *BookmarkService) CreateCollection(ctx context.Context, input CreateCollectionInput) (*BookmarkCollection, error) {
	if input.UserID == "" {
		return nil, errors.New("user_id is required")
	}
	if input.Name == "" {
		return nil, errors.New("name is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	_, _ = s.EnsureDefaultCollection(ctx, input.UserID)

	color := "#3B82F6"
	if input.Color != nil && *input.Color != "" {
		color = *input.Color
	}
	icon := "bookmark"
	if input.Icon != nil && *input.Icon != "" {
		icon = *input.Icon
	}

	c := &BookmarkCollection{}
	var desc sql.NullString
	if input.Description != nil {
		desc = sql.NullString{String: *input.Description, Valid: true}
	}
	var descOut sql.NullString
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO bookmark_collections (user_id, name, description, color, icon, is_default)
		VALUES ($1, $2, $3, $4, $5, FALSE)
		RETURNING id, user_id, name, description, color, icon, is_default, created_at
	`, input.UserID, input.Name, desc, color, icon)
	if err := row.Scan(&c.ID, &c.UserID, &c.Name, &descOut, &c.Color, &c.Icon, &c.IsDefault, &c.CreatedAt); err != nil {
		return nil, err
	}
	if descOut.Valid {
		v := descOut.String
		c.Description = &v
	}
	return c, nil
}

func (s *BookmarkService) DeleteCollection(ctx context.Context, userID, collectionID string) error {
	if userID == "" {
		return errors.New("user_id is required")
	}
	if collectionID == "" {
		return errors.New("collection_id is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM bookmark_collections WHERE id = $1 AND user_id = $2 AND is_default = FALSE`, collectionID, userID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *BookmarkService) ListBookmarks(ctx context.Context, input ListBookmarksInput) (*ListBookmarksResult, error) {
	if input.UserID == "" {
		return nil, errors.New("user_id is required")
	}
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	offset := (input.Page - 1) * input.Limit

	var total int64
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM bookmarks WHERE user_id = $1`, input.UserID).Scan(&total); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, post_id::text, collection_id::text, created_at::text
		FROM bookmarks
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, input.UserID, input.Limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Bookmark, 0)
	for rows.Next() {
		b := Bookmark{}
		if err := rows.Scan(&b.ID, &b.UserID, &b.PostID, &b.CollectionID, &b.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	hasMore := int64(input.Page*input.Limit) < total
	return &ListBookmarksResult{Bookmarks: items, TotalCount: total, HasMore: hasMore, Page: input.Page, Limit: input.Limit}, nil
}

type CreateBookmarkInput struct {
	UserID       string
	PostID       string
	CollectionID string
}

func (s *BookmarkService) CreateBookmark(ctx context.Context, input CreateBookmarkInput) (*Bookmark, error) {
	if input.UserID == "" {
		return nil, errors.New("user_id is required")
	}
	if input.PostID == "" {
		return nil, errors.New("post_id is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	defaultCollectionID, err := s.EnsureDefaultCollection(ctx, input.UserID)
	if err != nil {
		return nil, err
	}
	collectionID := input.CollectionID
	if collectionID == "" || collectionID == "default" {
		collectionID = defaultCollectionID
	}

	b := &Bookmark{}
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO bookmarks (user_id, post_id, collection_id)
		VALUES ($1, $2::uuid, $3::uuid)
		ON CONFLICT (user_id, post_id) DO UPDATE SET collection_id = EXCLUDED.collection_id
		RETURNING id, user_id, post_id::text, collection_id::text, created_at::text
	`, input.UserID, input.PostID, collectionID).Scan(&b.ID, &b.UserID, &b.PostID, &b.CollectionID, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (s *BookmarkService) DeleteBookmark(ctx context.Context, userID, postID string) error {
	if userID == "" {
		return errors.New("user_id is required")
	}
	if postID == "" {
		return errors.New("post_id is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2::uuid`, userID, postID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

type MoveBookmarkInput struct {
	UserID           string
	PostID           string
	FromCollectionID string
	ToCollectionID   string
}

func (s *BookmarkService) MoveBookmark(ctx context.Context, input MoveBookmarkInput) error {
	if input.UserID == "" {
		return errors.New("user_id is required")
	}
	if input.PostID == "" {
		return errors.New("post_id is required")
	}
	if input.ToCollectionID == "" {
		return errors.New("to_collection_id is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE bookmarks
		SET collection_id = $3::uuid
		WHERE user_id = $1 AND post_id = $2::uuid
	`, input.UserID, input.PostID, input.ToCollectionID)
	return err
}

type AddToCollectionInput struct {
	UserID       string
	PostID       string
	CollectionID string
}

func (s *BookmarkService) AddToCollection(ctx context.Context, input AddToCollectionInput) error {
	if input.UserID == "" {
		return errors.New("user_id is required")
	}
	if input.PostID == "" {
		return errors.New("post_id is required")
	}
	if input.CollectionID == "" {
		return errors.New("collection_id is required")
	}
	if s.db == nil {
		return errors.New("database not configured")
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO bookmarks (user_id, post_id, collection_id)
		VALUES ($1, $2::uuid, $3::uuid)
		ON CONFLICT (user_id, post_id) DO UPDATE SET collection_id = EXCLUDED.collection_id
	`, input.UserID, input.PostID, input.CollectionID)
	return err
}
