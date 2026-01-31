-- Migration: Add native authentication and lockout fields
-- This enables email/password login for users who originally signed up via Replit Auth

-- Add authentication tracking fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" text DEFAULT 'replit';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;

-- Add login security / lockout fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockout_until" timestamp;

-- Add index for email lookups during login (if not exists)
CREATE INDEX IF NOT EXISTS "idx_users_email_lower" ON "users" (LOWER("email"));

-- Comment on columns for documentation
COMMENT ON COLUMN "users"."auth_provider" IS 'How user originally signed up: replit or native';
COMMENT ON COLUMN "users"."last_login_at" IS 'Timestamp of last successful login';
COMMENT ON COLUMN "users"."failed_login_attempts" IS 'Consecutive failed login attempts (reset on success)';
COMMENT ON COLUMN "users"."lockout_until" IS 'If set and in future, user cannot attempt login';
