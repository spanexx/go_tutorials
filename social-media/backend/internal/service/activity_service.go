package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

type ActivityType string

const (
	ActivityTypeLike    ActivityType = "LIKE"
	ActivityTypeComment ActivityType = "COMMENT"
	ActivityTypeFollow  ActivityType = "FOLLOW"
	ActivityTypePost    ActivityType = "POST"
	ActivityTypeShare   ActivityType = "SHARE"
	ActivityTypeMention ActivityType = "MENTION"
)

type Activity struct {
	ID            string         `json:"id"`
	Type          ActivityType   `json:"type"`
	ActorID       string         `json:"actor_id"`
	ActorName     string         `json:"actor_name"`
	ActorUsername string         `json:"actor_username"`
	ActorAvatar   string         `json:"actor_avatar"`
	TargetUserID  string         `json:"target_user_id"`
	TargetID      string         `json:"target_id"`
	TargetType    string         `json:"target_type"`
	Content       string         `json:"content"`
	CreatedAt     time.Time      `json:"created_at"`
	ReadAt        *time.Time     `json:"read_at,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

type ActivityService struct {
	db *sql.DB
}

func NewActivityService(db *sql.DB) *ActivityService {
	return &ActivityService{db: db}
}

type CreateActivityInput struct {
	Type         ActivityType
	ActorID      string
	TargetUserID string
	TargetID     string
	TargetType   string
	Content      string
	Metadata     map[string]any
}

func (s *ActivityService) CreateActivity(ctx context.Context, input CreateActivityInput) (*Activity, error) {
	if input.ActorID == "" {
		return nil, errors.New("actor_id is required")
	}
	if input.TargetUserID == "" {
		return nil, errors.New("target_user_id is required")
	}
	if input.TargetID == "" {
		return nil, errors.New("target_id is required")
	}
	if input.TargetType == "" {
		return nil, errors.New("target_type is required")
	}
	if input.Type == "" {
		return nil, errors.New("type is required")
	}
	if s.db == nil {
		return nil, errors.New("database not configured")
	}

	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO activities (type, actor_id, target_user_id, target_id, target_type, content, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::jsonb, '{}'::jsonb))
		 RETURNING id, type, actor_id, target_user_id, target_id, target_type, content, created_at, read_at`,
		string(input.Type),
		input.ActorID,
		input.TargetUserID,
		input.TargetID,
		input.TargetType,
		input.Content,
		toJSONB(input.Metadata),
	)

	a := &Activity{}
	var readAt sql.NullTime
	if err := row.Scan(&a.ID, &a.Type, &a.ActorID, &a.TargetUserID, &a.TargetID, &a.TargetType, &a.Content, &a.CreatedAt, &readAt); err != nil {
		return nil, err
	}
	if readAt.Valid {
		t := readAt.Time
		a.ReadAt = &t
	}
	return a, nil
}

type ListFeedInput struct {
	UserID string
	Limit  int
	Cursor string
	Type   ActivityType
}

func (s *ActivityService) ListFeed(ctx context.Context, input ListFeedInput) ([]Activity, string, bool, error) {
	if input.UserID == "" {
		return nil, "", false, errors.New("user_id is required")
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}
	if s.db == nil {
		return []Activity{}, "", false, nil
	}

	args := []any{input.UserID, input.Limit + 1}
	where := "WHERE target_user_id = $1"

	if input.Type != "" {
		args = append(args, string(input.Type))
		where += " AND type = $3"
	}
	if input.Cursor != "" {
		cursorTime, err := time.Parse(time.RFC3339Nano, input.Cursor)
		if err != nil {
			return nil, "", false, errors.New("invalid cursor")
		}
		args = append(args, cursorTime)
		if input.Type != "" {
			where += " AND created_at < $4"
		} else {
			where += " AND created_at < $3"
		}
	}

	query := `SELECT
		a.id, a.type, a.actor_id,
		u.display_name, u.username, COALESCE(u.avatar_url, ''),
		a.target_user_id, a.target_id, a.target_type, COALESCE(a.content, ''), a.created_at, a.read_at, a.metadata
		FROM activities a
		JOIN users u ON u.id = a.actor_id
		` + where + `
		ORDER BY a.created_at DESC
		LIMIT $2`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", false, err
	}
	defer rows.Close()

	items := make([]Activity, 0)
	for rows.Next() {
		a := Activity{}
		var readAt sql.NullTime
		var metadataBytes []byte
		if err := rows.Scan(
			&a.ID,
			&a.Type,
			&a.ActorID,
			&a.ActorName,
			&a.ActorUsername,
			&a.ActorAvatar,
			&a.TargetUserID,
			&a.TargetID,
			&a.TargetType,
			&a.Content,
			&a.CreatedAt,
			&readAt,
			&metadataBytes,
		); err != nil {
			return nil, "", false, err
		}
		if readAt.Valid {
			t := readAt.Time
			a.ReadAt = &t
		}
		if len(metadataBytes) > 0 {
			var m map[string]any
			if err := json.Unmarshal(metadataBytes, &m); err == nil {
				a.Metadata = m
			}
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, "", false, err
	}

	hasMore := len(items) > input.Limit
	if hasMore {
		items = items[:input.Limit]
	}

	nextCursor := ""
	if len(items) > 0 {
		nextCursor = items[len(items)-1].CreatedAt.Format(time.RFC3339Nano)
	}
	return items, nextCursor, hasMore, nil
}

func (s *ActivityService) MarkAsRead(ctx context.Context, userID, activityID string) error {
	if userID == "" {
		return errors.New("user_id is required")
	}
	if activityID == "" {
		return errors.New("activity_id is required")
	}
	if s.db == nil {
		return nil
	}

	res, err := s.db.ExecContext(
		ctx,
		`UPDATE activities SET read_at = NOW() WHERE id = $1 AND target_user_id = $2 AND read_at IS NULL`,
		activityID,
		userID,
	)
	if err != nil {
		return err
	}
	_, _ = res.RowsAffected()
	return nil
}

func (s *ActivityService) MarkAllAsRead(ctx context.Context, userID string) error {
	if userID == "" {
		return errors.New("user_id is required")
	}
	if s.db == nil {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `UPDATE activities SET read_at = NOW() WHERE target_user_id = $1 AND read_at IS NULL`, userID)
	return err
}

func toJSONB(v map[string]any) any {
	if len(v) == 0 {
		return nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	return string(b)
}
