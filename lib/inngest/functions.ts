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
      // The breaker will wrap the call to AssemblyAI
      const result = await assemblyAIBreaker.fire({ audioUrl, language: job.language as TranscriptionOptions['language'], speakerLabels: true });

      // Type guard to check for the fallback response
      if ('error' in result) {
        // Throw an error to force Inngest to retry the step later
        throw new Error(result.error as string);
      }

      return result;
    });

    await step.run('save-results-and-metadata', async () => {
      const urls = await saveTranscriptionResults(transcriptionResult, filename, audioUrl);

      // Generate and save speakers report (with error handling to avoid breaking transcription)
      let speakersUrl: string | undefined = undefined;
      try {
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

      await TranscriptionJobDB.updateResults(jobId, {
        assemblyaiId: transcriptionResult.id,
        txtUrl: urls.txtUrl,
        srtUrl: urls.srtUrl,
        vttUrl: urls.vttUrl,
        speakersUrl: speakersUrl,
        audioDuration: transcriptionResult.audioDuration,
        metadata,
      });

      await logTranscription(userId, filename, transcriptionResult.audioDuration);
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

    await step.run('update-status-transcribed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'transcribed');
    });

    // Automatically trigger summarization after transcription completes
    await step.run('trigger-summarization', async () => {
      await inngest.send({
        name: 'task/summarize',
        data: { jobId }
      });
      console.log(`[Inngest] Triggered summarization for job ${jobId}`);
    });

    console.log(`[Inngest] Transcription task for job ${jobId} completed.`);
    return { status: 'transcribed' };
  }
);
