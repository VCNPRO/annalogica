-- Migration: Add tags column to transcription_jobs table
-- Date: 2025-10-23
-- Description: Add tags array column for storing generated tags

-- Add tags column (array of text)
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN transcription_jobs.tags IS 'Array of generated tags for the transcription';
