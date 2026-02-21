-- Add email verification fields to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE;

-- Add password reset fields to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add index for email_verified status
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
