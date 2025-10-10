import { inngest } from './client';
import { TranscriptionJobDB } from '@/lib/db';
import {
  transcribeAudio,
  saveTranscriptionResults,
  generateSummary,
  saveSummary,
  type TranscriptionResult,
  type SummaryResult
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
      return await transcribeAudio({ audioUrl, language: 'es', speakerLabels: true });
    });

    await step.run('save-results-and-metadata', async () => {
      const urls = await saveTranscriptionResults(transcriptionResult, filename);
      
      const speakers = transcriptionResult.utterances
        ? [...new Set(transcriptionResult.utterances.map(u => u.speaker).filter(Boolean))].sort()
        : [];
        
      const metadata = { speakers };

      await TranscriptionJobDB.updateResults(jobId, {
        assemblyaiId: transcriptionResult.id,
        txtUrl: urls.txtUrl,
        srtUrl: urls.srtUrl,
        vttUrl: urls.vttUrl,
        audioDuration: transcriptionResult.audioDuration,
        metadata,
      });
      
      await logTranscription(userId, filename, transcriptionResult.audioDuration);
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

/**
 * [Task] Summarize File
 * Triggered on-demand. Generates summary and tags for a completed transcription.
 */
export const summarizeFile = inngest.createFunction(
  {
    id: 'task-summarize-file',
    name: 'Task: Summarize File',
    retries: 1,
  },
  { event: 'task/summarize' },
  async ({ event, step }) => {
    const { jobId } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || !job.txt_url) {
      console.error(`[Inngest] Job ${jobId} not found or not transcribed yet for summarization.`);
      return { error: 'Job not found or not transcribed' };
    }
    const { user_id: userId, filename, metadata } = job;

    const transcriptionText = await step.run('fetch-transcription-text', async () => {
        const response = await fetch(job.txt_url!);
        if (!response.ok) throw new Error('Failed to fetch transcription text for summary');
        return await response.text();
    });

    if (transcriptionText.length < 100) {
        console.log(`[Inngest] Skipping summary for job ${jobId} (text too short)`);
        return { status: 'skipped', reason: 'Text too short' };
    }

    const { summary, tags } = await step.run('generate-summary-and-tags', async () => {
        return await generateSummary(transcriptionText);
    });

    if (!summary) {
        console.warn(`[Inngest] Summary generation returned empty for job ${jobId}. Skipping save.`);
        return { status: 'skipped', reason: 'Empty summary generated' };
    }

    const summaryUrl = await step.run('save-summary', async () => {
        return await saveSummary(summary, filename);
    });

    await step.run('update-db-with-summary', async () => {
        const newMetadata = { ...metadata, tags };
        await TranscriptionJobDB.updateResults(jobId, {
            summaryUrl,
            metadata: newMetadata,
        });

        const tokensInput = Math.ceil(transcriptionText.slice(0, 8000).length / 4);
        const tokensOutput = Math.ceil(summary.length / 4);
        await logSummary(userId, tokensInput, tokensOutput, 'sonnet');
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    console.log(`[Inngest] Summarization task for job ${jobId} completed.`);
    return { status: 'completed' };
  }
);