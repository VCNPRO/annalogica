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
 * Process transcription job function
 * Runs asynchronously in background with retry logic
 */
export const processTranscription = inngest.createFunction(
  {
    id: 'process-transcription',
    name: 'Process Transcription Job',

    // Retry configuration
    retries: 3,

    // Rate limiting: max 5 concurrent jobs
    concurrency: {
      limit: 5
    }
  },
  { event: 'transcription/job.created' },
  async ({ event, step }) => {
    const { jobId, userId, audioUrl, filename } = event.data;

    console.log(`[Inngest] Processing job ${jobId}`, { filename, audioUrl });

    // Step 1: Update status to processing
    await step.run('update-status-processing', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
      return { status: 'processing' };
    });

    // Step 2: Transcribe with AssemblyAI
    const transcriptionResult = await step.run('transcribe-audio', async () => {
      try {
        console.log(`[Inngest] Starting AssemblyAI transcription for job ${jobId}`);

        const result = await transcribeAudio({
          audioUrl,
          language: 'es',
          speakerLabels: true
        });

        console.log(`[Inngest] Transcription completed:`, {
          id: result.id,
          textLength: result.text.length,
          duration: result.audioDuration,
          speakers: result.utterances?.length || 0
        });

        // Track transcription usage
        await logTranscription(userId, filename, result.audioDuration);

        return result;
      } catch (error: any) {
        console.error(`[Inngest] Transcription failed for job ${jobId}:`, error.message);

        // Update job as failed
        await TranscriptionJobDB.updateStatus(jobId, 'failed', error.message);
        await TranscriptionJobDB.incrementRetry(jobId);

        throw error; // Will trigger Inngest retry
      }
    });

    // Step 3: Save transcription files (TXT, SRT, VTT)
    const fileUrls = await step.run('save-transcription-files', async () => {
      try {
        const urls = await saveTranscriptionResults(transcriptionResult, filename);

        console.log(`[Inngest] Files saved for job ${jobId}:`, urls);

        // Update job with file URLs
        await TranscriptionJobDB.updateResults(jobId, {
          assemblyaiId: transcriptionResult.id,
          txtUrl: urls.txtUrl,
          srtUrl: urls.srtUrl,
          vttUrl: urls.vttUrl,
          audioDuration: transcriptionResult.audioDuration
        });

        return urls;
      } catch (error: any) {
        console.error(`[Inngest] Failed to save files for job ${jobId}:`, error.message);
        throw error;
      }
    });

    // Step 4: Enrich with AI summary/tags and save all metadata
    const finalData = await step.run('enrich-and-save-metadata', async () => {
      try {
        let summaryUrl: string | null = null;
        let tags: string[] = [];
        
        // Generate summary and tags if text is long enough
        if (transcriptionResult.text.length >= 100) {
          console.log(`[Inngest] Generating summary and tags for job ${jobId}`);
          const summaryResult = await generateSummary(transcriptionResult.text);

          if (summaryResult.summary) {
            summaryUrl = await saveSummary(summaryResult.summary, filename);
            console.log(`[Inngest] Summary saved for job ${jobId}:`, summaryUrl);
            
            // Track summary usage
            const tokensInput = Math.ceil(transcriptionResult.text.slice(0, 8000).length / 4);
            const tokensOutput = Math.ceil(summaryResult.summary.length / 4);
            await logSummary(userId, tokensInput, tokensOutput, 'sonnet');
          }
          tags = summaryResult.tags;
        } else {
          console.log(`[Inngest] Skipping summary for job ${jobId} (text too short)`);
        }

        // Extract speakers from transcription
        const speakers = transcriptionResult.utterances
          ? [...new Set(transcriptionResult.utterances.map(u => u.speaker))].sort()
          : [];

        // Prepare metadata object
        const metadata = {
          speakers,
          tags,
        };

        // Update job with summary URL and all metadata
        await TranscriptionJobDB.updateResults(jobId, {
          summaryUrl,
          metadata,
        });
        
        console.log(`[Inngest] Metadata saved for job ${jobId}`, { summaryUrl, speakers, tags });

        return { summaryUrl, metadata };
      } catch (error: any) {
        console.error(`[Inngest] Enrichment failed for job ${jobId}:`, error.message);
        // Do not fail the entire job if this step fails
        return { summaryUrl: null, metadata: {} };
      }
    });

    // Step 5: Mark job as completed
    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');

      console.log(`[Inngest] Job ${jobId} completed successfully`, {
        txtUrl: fileUrls.txtUrl,
        srtUrl: fileUrls.srtUrl,
        vttUrl: fileUrls.vttUrl,
        summaryUrl
      });

      return { status: 'completed' };
    });

    return {
      jobId,
      status: 'completed',
      results: {
        ...fileUrls,
        summaryUrl
      }
    };
  }
);
