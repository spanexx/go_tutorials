-- Drop indexes
DROP INDEX IF EXISTS idx_users_email_verified;
DROP INDEX IF EXISTS idx_users_password_reset_token;
DROP INDEX IF EXISTS idx_users_email_verification_token;

-- Remove email verification and password reset fields
ALTER TABLE users 
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF NOT EXISTS email_verification_token,
    DROP COLUMN IF NOT EXISTS email_verification_expires,
    DROP COLUMN IF NOT EXISTS password_reset_token,
    DROP COLUMN IF NOT EXISTS password_reset_expires;
