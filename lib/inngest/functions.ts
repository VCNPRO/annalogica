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

    // Conditionally trigger summarization/tagging ONLY if requested
    const actions: string[] = job.metadata?.actions || [];
    const needsSummaryOrTags = actions.includes('Resumir') || actions.includes('Etiquetas');

    if (needsSummaryOrTags) {
      await step.run('trigger-summarization', async () => {
        console.log('[Inngest] ✅ Resumir and/or Etiquetas requested - triggering processing');
        console.log('[Inngest] Actions requested:', actions);
        await inngest.send({
          name: 'task/summarize',
          data: {
            jobId,
            actions // Pass actions to control what gets generated
          }
        });
        console.log(`[Inngest] Triggered summarization/tagging for job ${jobId}`);
      });
    } else {
      console.log('[Inngest] ⏭️ Resumir/Etiquetas NOT requested - skipping');
      // Mark as completed immediately since no summary/tags needed
      await step.run('mark-completed-no-summary', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'completed');
        console.log(`[Inngest] Job ${jobId} marked as completed (no summary/tags requested)`);
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
    const { jobId, actions: requestedActions } = event.data;
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

    // Determine what needs to be generated based on actions
    const actions = requestedActions || metadata?.actions || [];
    const generateSummary = actions.includes('Resumir');
    const generateTags = actions.includes('Etiquetas');
    const summaryType = metadata?.summaryType || 'detailed'; // 'short' or 'detailed'

    console.log('[Inngest] Summarization task:', { generateSummary, generateTags, summaryType });

    const { summary, tags } = await step.run('generate-summary-and-tags', async () => {
        // Use LeMUR with the transcript ID directly
        const result = await generateSummaryWithLeMUR(
          job.assemblyai_id!,
          job.language || 'es',
          generateSummary,
          generateTags,
          summaryType
        );

        // Validate that we got what was requested
        if (generateSummary && !result.summary) {
          throw new Error('LeMUR returned empty summary');
        }

        return result;
    });

    // Only save and update if we actually generated something
    let summaryUrl: string | undefined = undefined;

    if (generateSummary && summary) {
      summaryUrl = await step.run('save-summary', async () => {
          return await saveSummary(summary, filename);
      });
    }

    await step.run('update-db-with-summary', async () => {
        // Build metadata with tags if generated
        const newMetadata = { ...metadata };
        if (generateTags && tags && tags.length > 0) {
          newMetadata.tags = tags;
        }

        // Build update object conditionally
        const updateData: any = {
          metadata: newMetadata,
        };

        // Only add summaryUrl if summary was generated
        if (summaryUrl) {
          updateData.summaryUrl = summaryUrl;
        }

        await TranscriptionJobDB.updateResults(jobId, updateData);

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

/**
 * [Task] Summarize Document
 * Triggered for text documents (PDF, TXT, DOCX).
 * Generates summary and/or tags directly from text without AssemblyAI.
 */
export const summarizeDocument = inngest.createFunction(
  {
    id: 'task-summarize-document',
    name: 'Task: Summarize Document',
    retries: 1,
  },
  { event: 'task/summarize-document' },
  async ({ event, step }) => {
    const { jobId, actions, text, language, summaryType } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job) {
      console.error(`[Inngest] Job ${jobId} not found for document summarization.`);
      return { error: 'Job not found' };
    }

    const { user_id: userId, filename, metadata } = job;

    const generateSummary = actions.includes('Resumir');
    const generateTags = actions.includes('Etiquetas');

    console.log('[Inngest] Document summarization task:', {
      jobId,
      generateSummary,
      generateTags,
      summaryType,
      textLength: text.length
    });

    const { summary, tags } = await step.run('generate-summary-and-tags-direct', async () => {
      // Use Claude directly via AssemblyAI LeMUR-style API or direct Anthropic API
      // For now, we'll use a helper function that processes text directly
      return await generateSummaryFromText(text, language, generateSummary, generateTags, summaryType);
    });

    // Save results
    let summaryUrl: string | undefined = undefined;

    if (generateSummary && summary) {
      summaryUrl = await step.run('save-summary', async () => {
        return await saveSummary(summary, filename);
      });
    }

    await step.run('update-db-with-results', async () => {
      const newMetadata = { ...metadata };
      if (generateTags && tags && tags.length > 0) {
        newMetadata.tags = tags;
      }

      const updateData: any = {
        metadata: newMetadata,
      };

      if (summaryUrl) {
        updateData.summaryUrl = summaryUrl;
      }

      await TranscriptionJobDB.updateResults(jobId, updateData);

      // Log usage
      const tokensInput = Math.ceil(text.length / 4);
      const tokensOutput = Math.ceil((summary?.length || 0) / 4);
      await logSummary(userId, tokensInput, tokensOutput);
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    console.log(`[Inngest] Document summarization task for job ${jobId} completed.`);
    return { status: 'completed' };
  }
);

/**
 * Helper function to generate summary/tags from raw text
 * Uses Claude via Anthropic API directly
 */
async function generateSummaryFromText(
  text: string,
  language: string = 'es',
  generateSummary: boolean = true,
  generateTags: boolean = true,
  summaryType: 'short' | 'detailed' = 'detailed'
): Promise<{ summary: string; tags: string[] }> {
  // For documents, we'll use Anthropic's API directly instead of AssemblyAI
  // This requires ANTHROPIC_API_KEY environment variable

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[Document] ANTHROPIC_API_KEY not set, falling back to empty results');
    return { summary: '', tags: [] };
  }

  try {
    // Build prompt based on what's requested
    let prompt = '';

    const summaryPromptsShort: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 1-2 párrafos breves (máximo 150 palabras). Sé conciso y directo.',
      'en': 'Summarize the following text in English in 1-2 brief paragraphs (maximum 150 words). Be concise and direct.',
    };

    const summaryPromptsDetailed: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 3-4 párrafos detallados. Incluye los puntos clave y contexto relevante.',
      'en': 'Summarize the following text in English in 3-4 detailed paragraphs. Include key points and relevant context.',
    };

    const tagsPrompts: Record<string, string> = {
      'es': 'Genera una lista de 5-7 tags/categorías principales que describan el contenido, separadas por comas.',
      'en': 'Generate a list of 5-7 main tags/categories that describe the content, separated by commas.',
    };

    if (generateSummary && generateTags) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = `${summaryPromptSet[language] || summaryPromptSet['es']} Después, añade una sección llamada "Tags:" seguida de ${tagsPrompts[language] || tagsPrompts['es']}`;
    } else if (generateSummary) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = summaryPromptSet[language] || summaryPromptSet['es'];
    } else if (generateTags) {
      prompt = tagsPrompts[language] || tagsPrompts['es'];
    } else {
      return { summary: '', tags: [] };
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nTexto:\n${text.substring(0, 100000)}` // Limit to ~100k chars
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Document] Claude API error:', errorData);
      throw new Error('Error calling Claude API');
    }

    const data = await response.json();
    const fullText = data.content[0].text;

    // Parse results
    let summary = '';
    let tags: string[] = [];

    if (generateSummary && generateTags) {
      const tagsMarker = /\n(Tags|Etiquetas):/i;
      const match = fullText.match(tagsMarker);

      if (match && match.index) {
        summary = fullText.slice(0, match.index).trim();
        const tagsString = fullText.slice(match.index + match[0].length).trim();
        tags = tagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      } else {
        summary = fullText.trim();
      }
    } else if (generateSummary) {
      summary = fullText.trim();
    } else if (generateTags) {
      tags = fullText.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    console.log('[Document] Claude processing completed:', {
      summaryLength: summary.length,
      tagsCount: tags.length
    });

    return { summary, tags };

  } catch (error: any) {
    console.error('[Document] Error generating summary from text:', error);
    return { summary: '', tags: [] };
  }
}