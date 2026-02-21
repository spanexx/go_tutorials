-- name: FollowUser :one
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) 
DO UPDATE SET 
    created_at = NOW()
RETURNING *;

-- name: UnfollowUser :one
UPDATE follows
SET deleted_at = NOW()
WHERE follower_id = $1 AND following_id = $2 AND deleted_at IS NULL
RETURNING *;

-- name: IsFollowing :one
SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = $1 AND following_id = $2 AND deleted_at IS NULL
) as is_following;

-- name: GetFollowers :many
SELECT 
    f.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar,
    u.is_verified as user_is_verified,
    EXISTS (
        SELECT 1 FROM follows f2
        WHERE f2.follower_id = $2 AND f2.following_id = f.follower_id AND f2.deleted_at IS NULL
    ) as is_following_back
FROM follows f
INNER JOIN users u ON f.follower_id = u.id
WHERE f.following_id = $1 AND f.deleted_at IS NULL
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetFollowing :many
SELECT 
    f.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar,
    u.is_verified as user_is_verified,
    EXISTS (
        SELECT 1 FROM follows f2
        WHERE f2.follower_id = $2 AND f2.following_id = f.following_id AND f2.deleted_at IS NULL
    ) as is_following_back
FROM follows f
INNER JOIN users u ON f.following_id = u.id
WHERE f.follower_id = $1 AND f.deleted_at IS NULL
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFollowers :one
SELECT COUNT(*) as count
FROM follows
WHERE following_id = $1 AND deleted_at IS NULL;

-- name: CountFollowing :one
SELECT COUNT(*) as count
FROM follows
WHERE follower_id = $1 AND deleted_at IS NULL;

-- name: GetMutualFollows :many
SELECT 
    f.*,
    u.name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar
FROM follows f
INNER JOIN users u ON f.following_id = u.id
WHERE f.follower_id = $1 
    AND f.following_id IN (
        SELECT follower_id 
        FROM follows 
        WHERE following_id = $2 AND deleted_at IS NULL
    )
    AND f.deleted_at IS NULL
ORDER BY f.created_at DESC;

-- name: GetFollowSuggestions :many
SELECT 
    u.*,
    COUNT(f2.follower_id) as mutual_followers_count
FROM users u
INNER JOIN follows f ON u.id = f.follower_id
LEFT JOIN follows f2 ON u.id = f2.follower_id AND f2.following_id = $1
WHERE f.following_id = ANY($2::uuid[])
    AND u.id != $1
    AND u.id NOT IN (
        SELECT following_id 
        FROM follows 
        WHERE follower_id = $1 AND deleted_at IS NULL
    )
GROUP BY u.id
ORDER BY mutual_followers_count DESC, u.created_at DESC
LIMIT $3;
