-- Migration: 000003_create_posts_tables (DOWN)
-- Description: Drop posts, comments, reactions, and follows tables

-- Drop indexes first
DROP INDEX IF EXISTS idx_post_mentions_user_id;
DROP INDEX IF EXISTS idx_post_mentions_post_id;
DROP INDEX IF EXISTS idx_post_hashtags_hashtag;
DROP INDEX IF EXISTS idx_post_hashtags_post_id;
DROP INDEX IF EXISTS idx_follows_unique;
DROP INDEX IF EXISTS idx_follows_following_id;
DROP INDEX IF EXISTS idx_follows_follower_id;
DROP INDEX IF EXISTS idx_reactions_type;
DROP INDEX IF EXISTS idx_reactions_user_id;
DROP INDEX IF EXISTS idx_reactions_comment_id;
DROP INDEX IF EXISTS idx_reactions_post_id;
DROP INDEX IF EXISTS idx_comments_deleted_at;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_parent_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_post_id;
DROP INDEX IF EXISTS idx_posts_hashtag;
DROP INDEX IF EXISTS idx_posts_deleted_at;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_user_id;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS post_mentions CASCADE;
DROP TABLE IF EXISTS post_hashtags CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
