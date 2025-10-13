-- Migration: Add notification tracking columns to users table
-- Date: 2025-10-13
-- Purpose: Track last sent notification timestamps to avoid spam

-- Add columns for tracking notification timestamps
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_quota_warning_sent TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_trial_warning_sent TIMESTAMP;

-- Add indexes for performance on notification queries
CREATE INDEX IF NOT EXISTS idx_users_quota_check
  ON users(monthly_usage, monthly_quota, subscription_status, last_quota_warning_sent)
  WHERE monthly_quota > 0 AND subscription_status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS idx_users_trial_check
  ON users(subscription_status, subscription_end_date, last_trial_warning_sent)
  WHERE subscription_status = 'trialing' AND subscription_end_date IS NOT NULL;

-- Add comment to document columns
COMMENT ON COLUMN users.last_quota_warning_sent IS 'Timestamp of last quota warning email sent (80%+ usage)';
COMMENT ON COLUMN users.last_trial_warning_sent IS 'Timestamp of last trial expiration warning email sent';
