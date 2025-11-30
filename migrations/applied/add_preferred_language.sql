-- Migration: Add preferred_language field to users table
-- Date: 2025-11-02
-- Description: Add language preference for i18n support (9 languages)

-- Add preferred_language column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Update existing users to have default language 'es'
UPDATE users
SET preferred_language = 'es'
WHERE preferred_language IS NULL;

-- Add comment to column
COMMENT ON COLUMN users.preferred_language IS 'User preferred UI language: es, ca, eu, gl, en, fr, pt, it, de';
