/**
 * Job polling hook
 * Manages background polling of job status updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { PROCESSING_CONSTANTS } from '@/constants/processing';
import type { UploadedFile, FileProcessingState } from '@/types/file';
import type { TranscriptionJob } from '@/types/job';

export interface UseJobPollingOptions {
  files: UploadedFile[];
  onUpdate: (fileId: string, updates: Partial<UploadedFile>) => void;
  enabled?: boolean;
  pollInterval?: number;
}

interface JobUpdateData {
  fileId: string;
  updates: Partial<UploadedFile>;
}

/**
 * Calculate processing progress based on job status and elapsed time
 */
function calculateProgress(
  job: TranscriptionJob,
  processingStartTime: number | undefined
): Partial<FileProcessingState> {
  const now = Date.now();
  const createdAt = new Date(job.created_at).getTime();
  const elapsed = (now - createdAt) / 1000; // seconds
  const audioDuration = job.audio_duration_seconds || 60;
  const estimatedTotalTime = audioDuration * PROCESSING_CONSTANTS.WHISPER_PROCESSING_MULTIPLIER;

  // Job is transcribed but waiting for summary
  if (job.status === 'transcribed') {
    return {
      processingProgress: PROCESSING_CONSTANTS.TRANSCRIBED_PROGRESS,
      estimatedTimeRemaining: PROCESSING_CONSTANTS.SUMMARY_GENERATION_SECONDS,
      processingStartTime: processingStartTime || now,
    };
  }

  // Job is processing
  if (job.status === 'processing') {
    const baseProgress = Math.floor((elapsed / estimatedTotalTime) * 100);
    const progress = Math.min(PROCESSING_CONSTANTS.PROGRESS_CAP_BEFORE_COMPLETION, baseProgress);
    const remainingProgress = 100 - progress;
    const timeRemaining = Math.ceil((remainingProgress / 100) * estimatedTotalTime);

    return {
      processingProgress: progress,
      estimatedTimeRemaining: timeRemaining,
      processingStartTime: processingStartTime || now,
      audioDuration,
    };
  }

  return {};
}

/**
 * Hook for polling job status updates
 */
export function useJobPolling({
  files,
  onUpdate,
  enabled = true,
  pollInterval = PROCESSING_CONSTANTS.POLL_INTERVAL_MS
}: UseJobPollingOptions): void {
  const isCancelledRef = useRef(false);
  const activeRequestsRef = useRef(new Set<string>());

  const pollJobs = useCallback(async () => {
    if (!enabled || isCancelledRef.current) return;

    // Filter active jobs (pending or processing)
    const activeJobs = files.filter(
      f => f.status === 'processing' || f.status === 'pending'
    ) as (UploadedFile & { jobId: string })[];

    if (activeJobs.length === 0) return;

    // Fetch all job statuses in parallel (excluding already in-flight requests)
    const jobsToFetch = activeJobs.filter(job => !activeRequestsRef.current.has(job.jobId));

    const results = await Promise.all(
      jobsToFetch.map(async (file): Promise<JobUpdateData | null> => {
        const jobId = file.jobId;
        activeRequestsRef.current.add(jobId);

        try {
          const res = await fetch(`/api/jobs/${jobId}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!res.ok) {
            logger.warn('Job poll failed', {
              jobId,
              status: res.status
            });
            return null;
          }

          const data = await res.json();
          const job: TranscriptionJob = data.job;

          // Check for stuck jobs
          if ('processingStartTime' in file && file.processingStartTime) {
            const timeSinceStart = (Date.now() - file.processingStartTime) / 1000;
            const audioDuration = job.audio_duration_seconds || 60;
            const maxExpectedTime = audioDuration * PROCESSING_CONSTANTS.TIMEOUT_MULTIPLIER;
            const timeoutThreshold = Math.max(maxExpectedTime, PROCESSING_CONSTANTS.MIN_TIMEOUT_SECONDS);

            if (timeSinceStart > timeoutThreshold && (job.status === 'processing' || job.status === 'pending')) {
              logger.warn('Job appears stuck', {
                jobId,
                elapsed: Math.floor(timeSinceStart),
                expected: Math.floor(maxExpectedTime)
              });
            }
          }

          // Determine new status and progress
          let updates: Partial<UploadedFile> = {};

          if (job.status === 'completed' || job.status === 'summarized') {
            updates = {
              status: 'completed',
              processingProgress: 100,
            };
          } else if (job.status === 'failed' || job.status === 'error') {
            updates = {
              status: 'error',
              errorMessage: job.error_message || 'Error al procesar'
            };
          } else if (job.status === 'processing' || job.status === 'transcribed') {
            const progressUpdates = calculateProgress(
              job,
              'processingStartTime' in file ? file.processingStartTime : undefined
            );
            updates = {
              status: 'processing',
              ...progressUpdates,
            };
          } else if (job.status === 'pending') {
            updates = {
              status: 'pending'
            };
          }

          return {
            fileId: file.id,
            updates
          };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            logger.warn('Job poll timeout', { jobId });
          } else {
            logger.error('Job poll error', error, { jobId });
          }
          return null;
        } finally {
          activeRequestsRef.current.delete(jobId);
        }
      })
    );

    // Apply all updates
    if (!isCancelledRef.current) {
      results.forEach(result => {
        if (result) {
          onUpdate(result.fileId, result.updates);
        }
      });
    }
  }, [files, onUpdate, enabled]);

  useEffect(() => {
    if (!enabled) return;

    isCancelledRef.current = false;

    // Poll immediately
    pollJobs();

    // Set up interval
    const intervalId = setInterval(pollJobs, pollInterval);

    // Cleanup
    return () => {
      isCancelledRef.current = true;
      clearInterval(intervalId);
      activeRequestsRef.current.clear();
    };
  }, [files.length, enabled, pollInterval, pollJobs]);
}
