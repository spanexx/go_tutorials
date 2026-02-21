-- name: AddReaction :one
INSERT INTO reactions (post_id, comment_id, user_id, type)
VALUES ($1, $2, $3, $4)
ON CONFLICT (post_id, comment_id, user_id, type) 
DO UPDATE SET 
    updated_at = NOW(),
    deleted_at = NULL
RETURNING *;

-- name: RemoveReaction :one
UPDATE reactions
SET 
    deleted_at = NOW(),
    updated_at = NOW()
WHERE 
    ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
    AND user_id = $3
    AND type = $4
    AND deleted_at IS NULL
RETURNING *;

-- name: GetReactionsByPostID :many
SELECT 
    r.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar
FROM reactions r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.post_id = $1 AND r.deleted_at IS NULL
ORDER BY r.created_at DESC;

-- name: GetReactionsByCommentID :many
SELECT 
    r.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar
FROM reactions r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.comment_id = $1 AND r.deleted_at IS NULL
ORDER BY r.created_at DESC;

-- name: GetUserReaction :one
SELECT * FROM reactions
WHERE 
    ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
    AND user_id = $3
    AND deleted_at IS NULL;

-- name: CountReactionsByType :one
SELECT COUNT(*) as count
FROM reactions
WHERE 
    ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
    AND type = $3
    AND deleted_at IS NULL;

-- name: GetReactionCountsByPostID :many
SELECT 
    type,
    COUNT(*) as count
FROM reactions
WHERE post_id = $1 AND comment_id IS NULL AND deleted_at IS NULL
GROUP BY type
ORDER BY count DESC;

-- name: GetReactionCountsByCommentID :many
SELECT 
    type,
    COUNT(*) as count
FROM reactions
WHERE comment_id = $1 AND post_id IS NULL AND deleted_at IS NULL
GROUP BY type
ORDER BY count DESC;

-- name: GetTotalReactionCount :one
SELECT COUNT(*) as count
FROM reactions
WHERE 
    ((post_id = $1 AND comment_id IS NULL) OR (comment_id = $2 AND post_id IS NULL))
    AND deleted_at IS NULL;

-- name: GetUserReactionsByPostID :many
SELECT 
    type,
    COUNT(*) as count
FROM reactions
WHERE post_id = $1 AND user_id = $2 AND deleted_at IS NULL
GROUP BY type;

-- name: ToggleReaction :one
INSERT INTO reactions (post_id, comment_id, user_id, type)
VALUES ($1, $2, $3, $4)
ON CONFLICT (post_id, comment_id, user_id, type) 
DO UPDATE SET 
    deleted_at = CASE 
        WHEN reactions.deleted_at IS NULL THEN NOW()
        ELSE NULL
    END,
    updated_at = NOW()
RETURNING *;
