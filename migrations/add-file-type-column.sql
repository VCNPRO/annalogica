-- Migration: Add file_type column to transcription_jobs
-- Date: 2025-10-23
-- Description: Track whether job is audio or document for analytics

-- Add file_type column
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'audio';

-- Update existing records based on metadata
UPDATE transcription_jobs
SET file_type = CASE
  WHEN metadata::jsonb ? 'isDocument' AND (metadata::jsonb->>'isDocument')::boolean = true THEN 'document'
  ELSE 'audio'
END
WHERE file_type = 'audio';

-- Add comment
COMMENT ON COLUMN transcription_jobs.file_type IS 'Type of file: audio or document';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_file_type ON transcription_jobs(file_type);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_file_type ON transcription_jobs(user_id, file_type);
