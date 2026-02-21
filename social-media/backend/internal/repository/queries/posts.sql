-- name: CreatePost :one
INSERT INTO posts (user_id, content, image_url, video_url)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPostByID :one
SELECT * FROM posts
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetPostsWithDetails :many
SELECT 
    p.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar,
    u.is_verified as user_is_verified,
    COALESCE(rc.like_count, 0) as total_likes,
    COALESCE(rc.comment_count, 0) as total_comments,
    COALESCE(rc.share_count, 0) as total_shares,
    COALESCE(ur.type, '') as user_reaction_type
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(*) FILTER (WHERE type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')) as like_count,
        COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL) as comment_count,
        0 as share_count
    FROM reactions r
    LEFT JOIN comments c ON c.post_id = r.post_id AND c.deleted_at IS NULL
    WHERE r.deleted_at IS NULL
    GROUP BY r.post_id
) rc ON p.id = rc.post_id
LEFT JOIN reactions ur ON p.id = ur.post_id AND ur.user_id = $2 AND ur.deleted_at IS NULL
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdatePost :one
UPDATE posts
SET 
    content = COALESCE($2, content),
    image_url = COALESCE($3, image_url),
    video_url = COALESCE($4, video_url),
    is_edited = TRUE,
    edited_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: DeletePost :one
UPDATE posts
SET 
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: GetPostsByUserID :many
SELECT * FROM posts
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetPostsByHashtag :many
SELECT DISTINCT p.*
FROM posts p
INNER JOIN post_hashtags ph ON p.id = ph.post_id
WHERE ph.hashtag = $1 AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetThreadPosts :many
SELECT p.*
FROM posts p
WHERE p.user_id = ANY($1::uuid[]) AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

-- name: IncrementLikeCount :exec
UPDATE posts
SET 
    likes_count = likes_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: DecrementLikeCount :exec
UPDATE posts
SET 
    likes_count = GREATEST(likes_count - 1, 0),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: IncrementCommentCount :exec
UPDATE posts
SET 
    comments_count = comments_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: DecrementCommentCount :exec
UPDATE posts
SET 
    comments_count = GREATEST(comments_count - 1, 0),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: IncrementShareCount :exec
UPDATE posts
SET 
    shares_count = shares_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: IncrementViewCount :exec
UPDATE posts
SET 
    views_count = views_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: AddPostHashtag :exec
INSERT INTO post_hashtags (post_id, hashtag)
VALUES ($1, $2)
ON CONFLICT (post_id, hashtag) DO NOTHING;

-- name: RemovePostHashtags :exec
DELETE FROM post_hashtags
WHERE post_id = $1;

-- name: GetPostHashtags :many
SELECT hashtag FROM post_hashtags
WHERE post_id = $1
ORDER BY hashtag;

-- name: AddPostMention :exec
INSERT INTO post_mentions (post_id, user_id)
VALUES ($1, $2)
ON CONFLICT (post_id, user_id) DO NOTHING;

-- name: RemovePostMentions :exec
DELETE FROM post_mentions
WHERE post_id = $1;

-- name: GetPostMentions :many
SELECT user_id FROM post_mentions
WHERE post_id = $1
ORDER BY user_id;
