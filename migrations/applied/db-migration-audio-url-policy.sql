-- Migration: Update policy for audio_url column
-- Date: 2025-10-10
-- Description: Document that audio_url should only contain temporary URLs
--              Original audio files are deleted immediately after successful transcription
--              This column is kept for processing purposes only

-- Add comment to audio_url column to clarify its temporary nature
COMMENT ON COLUMN transcription_jobs.audio_url IS
  'Temporary URL to original audio file. File is deleted immediately after successful transcription.
   DO NOT rely on this URL for long-term storage. Only transcription outputs (txt, srt, vtt, summary) are retained.';

-- Note: No schema changes needed. This migration is documentation only.
-- The actual deletion of original files happens in lib/inngest/functions.ts after transcription completes.
