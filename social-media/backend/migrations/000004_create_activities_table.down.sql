-- Migration: 000004_create_activities_table (DOWN)

DROP INDEX IF EXISTS idx_activities_target_user_id_read_at;
DROP INDEX IF EXISTS idx_activities_target_user_id_created_at;
DROP TABLE IF EXISTS activities CASCADE;
