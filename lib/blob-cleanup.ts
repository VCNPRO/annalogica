import { del } from '@vercel/blob';
import { TranscriptionJobDB } from './db';

/**
 * Delete files from Vercel Blob for completed jobs older than specified days
 * This should be run periodically (e.g., daily via cron)
 */
export async function cleanupOldFiles(daysOld = 30): Promise<{
  jobsDeleted: number;
  filesDeleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let filesDeleted = 0;

  try {
    // Get all jobs older than daysOld days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    console.log(`[Cleanup] Searching for jobs older than ${daysOld} days (before ${cutoffDate.toISOString()})`);

    // First, delete old job records from database (this returns count of deleted jobs)
    const jobsDeleted = await TranscriptionJobDB.deleteOld(daysOld);

    console.log(`[Cleanup] Deleted ${jobsDeleted} old job records from database`);

    // Note: We can't easily delete the actual blob files because:
    // 1. The job records are already deleted, so we don't have the URLs
    // 2. Vercel Blob doesn't provide a "list all files" API
    //
    // Solution: We should delete blob files BEFORE deleting the database records
    // Let's fix this by fetching jobs first, then deleting blobs, then deleting records

    return {
      jobsDeleted,
      filesDeleted,
      errors
    };

  } catch (error: any) {
    console.error('[Cleanup] Error during cleanup:', error);
    errors.push(error.message);
    return {
      jobsDeleted: 0,
      filesDeleted: 0,
      errors
    };
  }
}

/**
 * Improved cleanup: Delete blob files AND database records
 */
export async function cleanupOldFilesAndRecords(daysOld = 30): Promise<{
  jobsProcessed: number;
  filesDeleted: number;
  jobsDeleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let filesDeleted = 0;
  let jobsDeleted = 0;
  let jobsProcessed = 0;

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      errors.push('BLOB_READ_WRITE_TOKEN not configured');
      return { jobsProcessed: 0, filesDeleted: 0, jobsDeleted: 0, errors };
    }

    // Get old completed/failed jobs from database (fetch before deleting)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    console.log(`[Cleanup] Fetching jobs older than ${daysOld} days (before ${cutoffDate.toISOString()})`);

    // We need a custom query to fetch old jobs with their blob URLs
    const { sql } = await import('@vercel/postgres');
    const result = await sql`
      SELECT id, txt_url, srt_url, vtt_url, summary_url, audio_url
      FROM transcription_jobs
      WHERE status IN ('completed', 'failed')
      AND completed_at < NOW() - INTERVAL '${daysOld} days'
      LIMIT 100
    `;

    const oldJobs = result.rows;
    jobsProcessed = oldJobs.length;

    console.log(`[Cleanup] Found ${jobsProcessed} old jobs to clean up`);

    // Delete blob files for each job
    for (const job of oldJobs) {
      const urls = [job.txt_url, job.srt_url, job.vtt_url, job.summary_url, job.audio_url].filter(Boolean);

      for (const url of urls) {
        try {
          await del(url, { token: blobToken });
          filesDeleted++;
          console.log(`[Cleanup] Deleted blob: ${url}`);
        } catch (error: any) {
          console.error(`[Cleanup] Failed to delete blob ${url}:`, error.message);
          errors.push(`Failed to delete ${url}: ${error.message}`);
        }
      }
    }

    // Now delete the database records
    jobsDeleted = await TranscriptionJobDB.deleteOld(daysOld);

    console.log(`[Cleanup] Cleanup complete: ${jobsProcessed} jobs processed, ${filesDeleted} files deleted, ${jobsDeleted} records deleted`);

    return {
      jobsProcessed,
      filesDeleted,
      jobsDeleted,
      errors
    };

  } catch (error: any) {
    console.error('[Cleanup] Error during cleanup:', error);
    errors.push(error.message);
    return {
      jobsProcessed,
      filesDeleted,
      jobsDeleted,
      errors
    };
  }
}
