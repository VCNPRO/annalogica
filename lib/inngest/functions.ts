import { inngest } from './client';
import { assemblyAIBreaker } from '@/lib/circuit-breakers';
import { TranscriptionJobDB } from '@/lib/db';
import {
  transcribeAudio,
  saveTranscriptionResults,
  saveSpeakersReport,
  identifySpeakersWithLeMUR,
  generateSummaryWithLeMUR,
  saveSummary,
  type TranscriptionResult,
  type SummaryResult,
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
      // Get selected actions from metadata
      const actions: string[] = job.metadata?.actions || [];
      console.log('[Inngest] Processing with actions:', actions);

      // Check if subtitles were requested
      const generateSubtitles = actions.includes('Subtítulos') || actions.includes('SRT') || actions.includes('VTT');
      console.log('[Inngest] Generate subtitles?', generateSubtitles);

      const urls = await saveTranscriptionResults(transcriptionResult, filename, audioUrl, generateSubtitles);

      // Initialize metadata with existing actions
      const metadata: any = { actions };

      // Conditional processing based on selected actions
      let speakerIdentities: Record<string, { name?: string; role?: string }> = {};
      let speakersUrl: string | undefined = undefined;

      // Process speakers ONLY if "Oradores" action is selected
      if (actions.includes('Oradores')) {
        console.log('[Inngest] ✅ Oradores requested - processing speaker identification');
        console.log('[DEBUG] ========== SPEAKER IDENTIFICATION START ==========');
        console.log('[DEBUG] Calling identifySpeakersWithLeMUR with:', {
          transcriptId: transcriptionResult.id,
          language: job.language || 'es',
          utterancesCount: transcriptionResult.utterances?.length || 0,
          speakers: transcriptionResult.utterances
            ? [...new Set(transcriptionResult.utterances.map(u => u.speaker).filter(Boolean))]
            : []
        });

        try {
          speakerIdentities = await identifySpeakersWithLeMUR(transcriptionResult.id, job.language || 'es');
          console.log('[DEBUG] Speaker identities result:', JSON.stringify(speakerIdentities, null, 2));
          console.log('[DEBUG] Has any identities?', Object.keys(speakerIdentities).length > 0);
          console.log('[DEBUG] Identity keys:', Object.keys(speakerIdentities));
          console.log('[Inngest] Speaker identification completed:', speakerIdentities);
        } catch (error: any) {
          console.error('[DEBUG] EXCEPTION in identifySpeakersWithLeMUR:', error.message);
          console.error('[DEBUG] Error stack:', error.stack);
          console.error('[Inngest] Failed to identify speakers (non-fatal):', error.message);
        }

        console.log('[DEBUG] ========== SPEAKERS REPORT GENERATION START ==========');
        console.log('[DEBUG] Generating speakers report with identities:', speakerIdentities);
        console.log('[DEBUG] Identities count:', Object.keys(speakerIdentities).length);

        try {
          speakersUrl = await saveSpeakersReport(transcriptionResult, filename, false, speakerIdentities);
          console.log('[DEBUG] Speakers report saved successfully:', speakersUrl);
          console.log('[Inngest] Speakers report saved successfully:', speakersUrl);
        } catch (error: any) {
          console.error('[DEBUG] EXCEPTION in saveSpeakersReport:', error.message);
          console.error('[DEBUG] Error stack:', error.stack);
          console.error('[Inngest] Failed to save speakers report (non-fatal):', error.message);
        }
        console.log('[DEBUG] ========== SPEAKERS REPORT GENERATION END ==========');
      } else {
        console.log('[Inngest] ⏭️ Oradores NOT requested - skipping speaker processing');
      }

      // Always collect speaker list (lightweight operation)
      const speakers = transcriptionResult.utterances
        ? [...new Set(transcriptionResult.utterances.map(u => u.speaker).filter(Boolean))].sort()
        : [];

      metadata.speakers = speakers;
      metadata.speakerIdentities = speakerIdentities;

      // Build update object conditionally
      const updateData: any = {
        assemblyaiId: transcriptionResult.id,
        txtUrl: urls.txtUrl,
        audioDuration: transcriptionResult.audioDuration,
        metadata,
      };

      // Include SRT/VTT URLs if they were generated
      if (urls.srtUrl && urls.vttUrl) {
        console.log('[Inngest] ✅ Including SRT/VTT URLs in database');
        updateData.srtUrl = urls.srtUrl;
        updateData.vttUrl = urls.vttUrl;
      } else {
        console.log('[Inngest] ⏭️ No SRT/VTT URLs to save');
      }

      // Include speakers URL if processed
      if (speakersUrl) {
        updateData.speakersUrl = speakersUrl;
      }

      await TranscriptionJobDB.updateResults(jobId, updateData);

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

    // Conditionally trigger summarization ONLY if requested
    const actions: string[] = job.metadata?.actions || [];
    if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
      await step.run('trigger-summarization', async () => {
        console.log('[Inngest] ✅ Resumir/Etiquetas requested - triggering summarization');
        await inngest.send({
          name: 'task/summarize',
          data: { jobId }
        });
        console.log(`[Inngest] Triggered summarization for job ${jobId}`);
      });
    } else {
      console.log('[Inngest] ⏭️ Resumir/Etiquetas NOT requested - skipping summarization');
      // Mark as completed immediately since no summary is needed
      await step.run('mark-completed-no-summary', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'completed');
        console.log(`[Inngest] Job ${jobId} marked as completed (no summary requested)`);
      });
    }

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

    if (!job.assemblyai_id) {
        console.error(`[Inngest] Job ${jobId} does not have AssemblyAI transcript ID for LeMUR`);
        return { error: 'No AssemblyAI transcript ID available' };
    }

    const { summary, tags } = await step.run('generate-summary-and-tags', async () => {
        // Use LeMUR with the transcript ID directly
        const result = await generateSummaryWithLeMUR(job.assemblyai_id!, job.language || 'es');

        if (!result.summary) {
          throw new Error('LeMUR returned empty summary');
        }

        return result;
    });

    if (!summary) {
        console.warn(`[Inngest] Summary generation returned empty for job ${jobId}. Marking as failed.`);
        await step.run('update-status-failed', async () => {
          await TranscriptionJobDB.updateStatus(jobId, 'failed', 'Summary generation failed');
        });
        return { status: 'failed', reason: 'Empty summary generated' };
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

        // Estimate tokens for LeMUR usage tracking
        const tokensInput = Math.ceil((job.txt_url?.length || 0) / 4); // Approximate
        const tokensOutput = Math.ceil(summary.length / 4);
        await logSummary(userId, tokensInput, tokensOutput);
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    console.log(`[Inngest] Summarization task for job ${jobId} completed.`);
    return { status: 'completed' };
  }
);