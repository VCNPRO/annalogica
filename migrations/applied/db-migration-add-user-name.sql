-- Migration: Add name field to users table
-- Date: 2025-10-10
-- Description: Add optional name field for user profiles

-- Add name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Create index for name searches (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Update existing users to have a default name (optional)
-- UPDATE users SET name = SPLIT_PART(email, '@', 1) WHERE name IS NULL;
