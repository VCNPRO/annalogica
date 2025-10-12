/**
 * Transcription job types for Annalogica
 */

export type JobStatus = 'pending' | 'processing' | 'transcribed' | 'summarized' | 'completed' | 'failed' | 'error';

export interface JobMetadata {
  speakers?: string[];
  tags?: string[];
  duration?: number;
  language?: string;
  [key: string]: any;
}

export interface TranscriptionJob {
  id: string;
  user_id: string;
  filename: string;
  audio_url: string;
  audio_duration_seconds?: number;
  status: JobStatus;

  // Output URLs
  txt_url?: string;
  srt_url?: string;
  vtt_url?: string;
  summary_url?: string;
  speakers_url?: string;

  // Metadata
  metadata?: JobMetadata;

  // Error handling
  error_message?: string;
  retry_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobCreatePayload {
  audioUrl: string;
  filename: string;
}

export interface JobStatusResponse {
  job: TranscriptionJob;
}

export interface JobCreateResponse {
  success: boolean;
  message: string;
  jobId: string;
  status: JobStatus;
}

/**
 * Type guard to check if job is active (pending or processing)
 */
export function isJobActive(job: TranscriptionJob): boolean {
  return job.status === 'pending' || job.status === 'processing';
}

/**
 * Type guard to check if job is complete
 */
export function isJobComplete(job: TranscriptionJob): boolean {
  return job.status === 'completed' || job.status === 'summarized';
}

/**
 * Type guard to check if job has failed
 */
export function isJobFailed(job: TranscriptionJob): boolean {
  return job.status === 'failed' || job.status === 'error';
}

/**
 * Type guard to check if job can be retried
 */
export function canRetryJob(job: TranscriptionJob): boolean {
  return isJobFailed(job) && job.retry_count < 3;
}
