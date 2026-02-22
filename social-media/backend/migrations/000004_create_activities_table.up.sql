-- Migration: 000004_create_activities_table
-- Description: Create activities table for activity feed

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activities_target_user_id_created_at ON activities(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_target_user_id_read_at ON activities(target_user_id, read_at);
