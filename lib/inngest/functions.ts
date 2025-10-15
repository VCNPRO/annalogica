import { inngest } from './client';
import { assemblyAIBreaker } from '@/lib/circuit-breakers';
import { TranscriptionJobDB } from '@/lib/db';
import {
  transcribeAudio,
  saveTranscriptionResults,
  saveSpeakersReport,
  type TranscriptionResult,
  type TranscriptionOptions
} from '@/lib/assemblyai-client';
import { logTranscription, logSummary } from '@/lib/usage-tracking';

/**
 * [Task] Transcribe File
 * Triggered on-demand. Transcribes audio, saves results, extracts speakers.
 */
export const transcribeFile = inngest.createFunction(
  {
    id: 'task-transcribe-file',
    name: 'Task: Transcribe File',
    retries: 2,
    concurrency: { limit: 5 }
  },
  { event: 'task/transcribe' },
  async ({ event, step }) => {
    const { jobId } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job) {
      console.error(`[Inngest] Job ${jobId} not found during transcription task.`);
      return { error: 'Job not found' };
    }
    const { user_id: userId, audio_url: audioUrl, filename } = job;

    console.log(`[Inngest] Starting transcription task for job ${jobId}`);

    await step.run('update-status-processing', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
    });

    const transcriptionResult = await step.run('transcribe-audio', async () => {
      try {
        // DEBUG: Bypassing circuit breaker to get the original error.
        console.log('[Inngest] DEBUG: Bypassing circuit breaker to get original error.');
        const result = await transcribeAudio({ audioUrl, language: job.language as TranscriptionOptions['language'], speakerLabels: true });

        // Type guard to check for a fallback-like response (less likely now)
        if (result && 'error' in result) {
          throw new Error(result.error as string);
        }

        return result;
      } catch (e: any) {
        console.error('[Inngest] FATAL: The direct call to AssemblyAI failed. The original error was:', e);
        // Re-throw the error so Inngest knows the step failed and will retry
        throw e;
      }
    });

    await step.run('save-results-and-metadata', async () => {
      console.log(`[Inngest] Step: save-results-and-metadata - START for job ${jobId}`);

      console.log(`[Inngest] ...saving transcription results...`);
      const urls = await saveTranscriptionResults(transcriptionResult, filename, audioUrl);
      console.log(`[Inngest] ...transcription results saved.`);

      // Generate and save speakers report (with error handling to avoid breaking transcription)
      let speakersUrl: string | undefined = undefined;
      try {
        console.log(`[Inngest] ...saving speakers report...`);
        speakersUrl = await saveSpeakersReport(transcriptionResult, filename);
        console.log('[Inngest] Speakers report saved successfully:', speakersUrl);
      } catch (error: any) {
        console.error('[Inngest] Failed to save speakers report (non-fatal):', error.message);
        // Don't fail the entire job - speakers report is supplementary
      }

      const speakers = transcriptionResult.utterances
        ? [...new Set(transcriptionResult.utterances.map(u => u.speaker).filter(Boolean))].sort()
        : [];

      const metadata = { speakers };

      console.log(`[Inngest] ...updating database with results...`);
      await TranscriptionJobDB.updateResults(jobId, {
        assemblyaiId: transcriptionResult.id,
        txtUrl: urls.txtUrl,
        srtUrl: urls.srtUrl,
        vttUrl: urls.vttUrl,
        speakersUrl: speakersUrl,
        audioDuration: transcriptionResult.audioDuration,
        metadata,
      });
      console.log(`[Inngest] ...database updated.`);

      console.log(`[Inngest] ...logging transcription usage...`);
      await logTranscription(userId, filename, transcriptionResult.audioDuration);
      console.log(`[Inngest] ...usage logged.`);

      console.log(`[Inngest] Step: save-results-and-metadata - END for job ${jobId}`);
    });

    // CLEANUP: Delete original audio file from Vercel Blob after successful transcription
    await step.run('delete-original-audio', async () => {
      try {
        const { del } = await import('@vercel/blob');
        await del(audioUrl);
        console.log(`[Inngest] ✅ Deleted original audio file: ${audioUrl}`);
      } catch (error: any) {
        console.error(`[Inngest] ⚠️ Failed to delete original audio file (non-fatal):`, error.message);
        // Don't fail the job - file deletion is cleanup only
      }
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    console.log(`[Inngest] Transcription task for job ${jobId} completed.`);
    return { status: 'completed' };
  }
);
