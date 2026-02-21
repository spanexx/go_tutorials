-- name: CreateComment :one
INSERT INTO comments (post_id, user_id, parent_id, content)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetCommentByID :one
SELECT * FROM comments
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetCommentsByPostID :many
SELECT 
    c.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar,
    u.is_verified as user_is_verified,
    COALESCE(rc.like_count, 0) as total_likes,
    COALESCE(rr.reply_count, 0) as total_replies
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN (
    SELECT comment_id, COUNT(*) as like_count
    FROM reactions
    WHERE comment_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY comment_id
) rc ON c.id = rc.comment_id
LEFT JOIN (
    SELECT parent_id, COUNT(*) as reply_count
    FROM comments
    WHERE parent_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY parent_id
) rr ON c.id = rr.parent_id
WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.deleted_at IS NULL
ORDER BY c.created_at ASC
LIMIT $2 OFFSET $3;

-- name: GetRepliesToComment :many
SELECT 
    c.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar,
    u.is_verified as user_is_verified,
    COALESCE(rc.like_count, 0) as total_likes
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN (
    SELECT comment_id, COUNT(*) as like_count
    FROM reactions
    WHERE comment_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY comment_id
) rc ON c.id = rc.comment_id
WHERE c.parent_id = $1 AND c.deleted_at IS NULL
ORDER BY c.created_at ASC;

-- name: GetCommentTree :many
WITH RECURSIVE comment_tree AS (
    SELECT 
        c.*,
        0 as depth,
        ARRAY[c.id] as path
    FROM comments c
    WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        c.*,
        ct.depth + 1,
        ct.path || c.id
    FROM comments c
    INNER JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE c.deleted_at IS NULL AND NOT c.id = ANY(ct.path)
)
SELECT * FROM comment_tree
ORDER BY path
LIMIT $2 OFFSET $3;

-- name: UpdateComment :one
UPDATE comments
SET 
    content = COALESCE($2, content),
    is_edited = TRUE,
    edited_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteComment :one
UPDATE comments
SET 
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: CountCommentsByPostID :one
SELECT COUNT(*) as count
FROM comments
WHERE post_id = $1 AND deleted_at IS NULL;

-- name: IncrementCommentLikes :exec
UPDATE comments
SET 
    likes_count = likes_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: DecrementCommentLikes :exec
UPDATE comments
SET 
    likes_count = GREATEST(likes_count - 1, 0),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: IncrementReplyCount :exec
UPDATE comments
SET 
    replies_count = replies_count + 1,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: DecrementReplyCount :exec
UPDATE comments
SET 
    replies_count = GREATEST(replies_count - 1, 0),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;
