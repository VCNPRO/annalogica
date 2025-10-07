-- Schema para tabla de jobs asíncronos
-- Ejecutar en Neon Postgres Console

CREATE TABLE IF NOT EXISTS transcription_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job info
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Possible statuses: 'pending', 'processing', 'completed', 'failed'

  -- Input data
  filename VARCHAR(500) NOT NULL,
  audio_url TEXT NOT NULL,
  audio_size_bytes BIGINT,
  audio_duration_seconds INT,

  -- AssemblyAI tracking
  assemblyai_id VARCHAR(200),

  -- Output URLs
  txt_url TEXT,
  srt_url TEXT,
  vtt_url TEXT,
  summary_url TEXT,

  -- Error handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_created_at ON transcription_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_assemblyai_id ON transcription_jobs(assemblyai_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_transcription_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transcription_jobs_timestamp
  BEFORE UPDATE ON transcription_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_jobs_updated_at();

-- Comments for documentation
COMMENT ON TABLE transcription_jobs IS 'Async transcription jobs queue with retry logic';
COMMENT ON COLUMN transcription_jobs.status IS 'pending | processing | completed | failed';
COMMENT ON COLUMN transcription_jobs.assemblyai_id IS 'AssemblyAI transcript ID for tracking';
COMMENT ON COLUMN transcription_jobs.retry_count IS 'Number of retry attempts (max 3)';
