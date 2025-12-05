// lib/processors/audio-processor.ts
// Hybrid audio processing: Speechmatics (eu, gl) + Deepgram (rest) + OpenAI
import OpenAI from 'openai';
import { createClient } from '@deepgram/sdk';
import { BatchClient } from '@speechmatics/batch-client';
import { put, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import {
  updateTranscriptionProgress,
  saveTranscriptionResults,
  markTranscriptionError,
  getTranscriptionJob
} from '@/lib/db/transcriptions';
import {
  getSpeakerIdentificationPrompt,
  getSummaryPrompt,
  getTagGenerationPrompt,
  normalizeLanguageCode
} from '@/lib/prompts/multilingual';
import { trackError } from '@/lib/error-tracker';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const deepgram = process.env.DEEPGRAM_API_KEY
  ? createClient(process.env.DEEPGRAM_API_KEY)
  : null;

const speechmatics = process.env.SPEECHMATICS_API_KEY
  ? new BatchClient({
      apiKey: process.env.SPEECHMATICS_API_KEY,
      appId: 'annalogica'
    })
  : null;

// Helper functions for subtitles
function formatTimeSRT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Process audio file directly (no Inngest)
 */
export async function processAudioFile(jobId: string): Promise<void> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  // Note: deepgram and speechmatics are checked later based on language

  try {
    console.log('[AudioProcessor] Starting processing for job:', jobId);

    // Get job data from database
    const job = await getTranscriptionJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    const { audio_url: audioUrl, filename: fileName, language: jobLanguage, user_id: userId } = job;

    // Normalize language for prompts
    const promptLanguage = normalizeLanguageCode(jobLanguage);

    console.log('[AudioProcessor] Job found:', { jobId, fileName, language: jobLanguage, promptLanguage });

    // Get user's client_id
    let clientId: number | undefined;
    try {
      const userResult = await sql`SELECT client_id FROM users WHERE id = ${userId}`;
      if (userResult.rows.length > 0) {
        clientId = userResult.rows[0].client_id;
        console.log('[AudioProcessor] User client_id:', clientId);
      }
    } catch (error) {
      console.error('[AudioProcessor] Error fetching user client_id:', error);
      // Continue without client_id
    }

    // Update progress: 10%
    await updateTranscriptionProgress(jobId, 10);

    // STEP 1: Validate audio URL (Deepgram works directly with URLs, no download needed)
    console.log('[AudioProcessor] Validating audio URL:', fileName);
    try {
      if (!audioUrl || !audioUrl.startsWith('http')) {
        throw new Error('Invalid audio URL format');
      }
      console.log('[AudioProcessor] ✅ Audio URL validated');
      await updateTranscriptionProgress(jobId, 20);
    } catch (error: any) {
      const errorMsg = `Audio URL validation failed: ${error.message}`;
      await trackError(
        'audio_url_validation_error',
        'critical',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName,
            audioUrl: audioUrl.substring(0, 100),
            step: 'STEP 1: Validate Audio URL',
            errorType: error.constructor.name
          }
        }
      );
      await markTranscriptionError(jobId, errorMsg);
      throw new Error(errorMsg);
    }

    // STEP 2: Transcribe with Speechmatics (eu, gl) or Deepgram (rest)
    const useSprechmatics = jobLanguage === 'eu' || jobLanguage === 'gl';
    const serviceName = useSprechmatics ? 'Speechmatics' : 'Deepgram';

    console.log(`[AudioProcessor] Starting ${serviceName} transcription...`, {
      language: jobLanguage,
      reason: useSprechmatics ? 'Basque/Galician language' : 'Standard language'
    });

    let transcriptionText: string;
    let transcriptionDuration: number;
    let transcriptionSegments: any[];

    if (useSprechmatics) {
      // SPEECHMATICS PATH (for eu, gl)
      if (!speechmatics) {
        throw new Error('Speechmatics API key not configured (required for Basque/Galician)');
      }

      try {
        // Call Speechmatics Batch API with URL
        const response = await speechmatics.transcribe(
          { url: audioUrl },
          {
            transcription_config: {
              language: jobLanguage,
              operating_point: 'enhanced',
              diarization: 'speaker',
              enable_entities: false
            }
          },
          'json-v2'
        );

        // Type guard: ensure response is an object with results
        if (!response || typeof response === 'string' || !('results' in response)) {
          throw new Error('Speechmatics returned invalid response format');
        }

        if (!response.results) {
          throw new Error('Speechmatics returned empty result');
        }

        // Extract transcription from Speechmatics response
        const words = response.results || [];
        transcriptionText = words
          .map((word: any) => word.alternatives?.[0]?.content || '')
          .join(' ')
          .trim();

        // Calculate duration from last word end time
        const lastWord = words[words.length - 1];
        transcriptionDuration = lastWord?.end_time || 0;

        // Group words into utterances by speaker
        const utteranceMap = new Map<number, any>();
        words.forEach((word: any) => {
          const speaker = word.speaker || 0;
          if (!utteranceMap.has(speaker)) {
            utteranceMap.set(speaker, {
              speaker,
              start: word.start_time,
              end: word.end_time,
              words: []
            });
          }
          const utterance = utteranceMap.get(speaker)!;
          utterance.end = word.end_time;
          utterance.words.push(word.alternatives?.[0]?.content || '');
        });

        transcriptionSegments = Array.from(utteranceMap.values()).map(u => ({
          speaker: u.speaker,
          start: u.start,
          end: u.end,
          transcript: u.words.join(' ')
        }));

        console.log('[AudioProcessor] ✅ Speechmatics transcription completed:', {
          duration: `${transcriptionDuration}s`,
          utterances: transcriptionSegments.length,
          textLength: transcriptionText.length,
          wordsCount: words.length
        });

        await updateTranscriptionProgress(jobId, 50);
      } catch (error: any) {
        const errorMsg = `Speechmatics transcription failed: ${error.message}`;
        await trackError(
          'speechmatics_transcription_error',
          'critical',
          errorMsg,
          error,
          {
            userId,
            metadata: {
              jobId,
              fileName,
              audioUrl: audioUrl.substring(0, 100),
              language: jobLanguage,
              step: 'STEP 2: Speechmatics Transcription',
              errorType: error.constructor.name,
              speechmaticsError: error.response?.data || error.message
            }
          }
        );
        await markTranscriptionError(jobId, errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      // DEEPGRAM PATH (for all other languages)
      if (!deepgram) {
        throw new Error('Deepgram API key not configured');
      }

      try {
        // Build Deepgram transcription params
        const deepgramOptions: any = {
          model: 'nova-3',
          smart_format: true,
          diarize: true,
          utterances: true,
          punctuate: true
        };

        // Only add language if not auto-detection
        if (jobLanguage && jobLanguage !== 'auto') {
          deepgramOptions.language = jobLanguage;
          console.log('[AudioProcessor] Using specified language:', jobLanguage);
        } else {
          console.log('[AudioProcessor] Using automatic language detection');
        }

        // Call Deepgram API with URL (no need to download file)
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
          { url: audioUrl },
          deepgramOptions
        );

        if (error) {
          throw new Error(`Deepgram API error: ${error.message}`);
        }

        if (!result) {
          throw new Error('Deepgram returned empty result');
        }

        // Extract transcription data from Deepgram response
        const channel = result.results?.channels?.[0];
        const alternative = channel?.alternatives?.[0];

        if (!alternative) {
          throw new Error('No transcription alternative found in Deepgram response');
        }

        transcriptionText = alternative.transcript || '';
        transcriptionDuration = result.metadata?.duration || 0;
        transcriptionSegments = result.results?.utterances || [];

        console.log('[AudioProcessor] ✅ Deepgram transcription completed:', {
          duration: `${transcriptionDuration}s`,
          utterances: transcriptionSegments.length,
          textLength: transcriptionText.length,
          confidence: alternative.confidence
        });

        await updateTranscriptionProgress(jobId, 50);
      } catch (error: any) {
        const errorMsg = `Deepgram transcription failed: ${error.message}`;
        await trackError(
          'deepgram_transcription_error',
          'critical',
          errorMsg,
          error,
          {
            userId,
            metadata: {
              jobId,
              fileName,
              audioUrl: audioUrl.substring(0, 100),
              language: jobLanguage,
              step: 'STEP 2: Deepgram Transcription',
              errorType: error.constructor.name,
              deepgramError: error.response?.data || error.message
            }
          }
        );
        await markTranscriptionError(jobId, errorMsg);
        throw new Error(errorMsg);
      }
    }

    // STEP 3-5: Process speakers, summary, and tags in PARALLEL (optimization)
    console.log('[AudioProcessor] Processing speakers, summary, and tags in parallel...', { language: promptLanguage });
    const summaryType = job.metadata?.summaryType || 'detailed';
    const { systemPrompt } = getSummaryPrompt(promptLanguage, summaryType);

    const [speakersResult, summaryResult, tagsResult] = await Promise.all([
      // 3a. Identify speakers
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getSpeakerIdentificationPrompt(promptLanguage)
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${transcriptionText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),

      // 4a. Generate summary
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${transcriptionText}`
          }
        ],
        temperature: 0.5,
        max_tokens: summaryType === 'short' ? 500 : 2000
      }),

      // 5a. Generate tags
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getTagGenerationPrompt(promptLanguage)
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${transcriptionText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    ]);

    // Extract results
    const speakersData = JSON.parse(speakersResult.choices[0].message.content || '{}');
    const speakers = speakersData.speakers || [];
    const summary = summaryResult.choices[0].message.content || '';
    const tagsData = JSON.parse(tagsResult.choices[0].message.content || '{}');
    const tags = tagsData.tags || [];

    console.log('[AudioProcessor] Parallel processing completed:', {
      speakers: speakers.length,
      summaryLength: summary.length,
      tags: tags.length
    });
    await updateTranscriptionProgress(jobId, 85);

    // STEP 6: Generate subtitles (SRT and VTT) from Deepgram utterances
    console.log('[AudioProcessor] Generating subtitles...');
    const utterances = transcriptionSegments || [];

    // Generate SRT from Deepgram utterances
    const srtContent = utterances.map((utterance: any, index: number) => {
      const startTime = formatTimeSRT(utterance.start);
      const endTime = formatTimeSRT(utterance.end);
      const speakerLabel = utterance.speaker !== undefined ? `Speaker ${utterance.speaker}` : 'Speaker';
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerLabel}: ${utterance.transcript.trim()}\n`;
    }).join('\n');

    // Generate VTT from Deepgram utterances
    const vttContent = 'WEBVTT\n\n' + utterances.map((utterance: any, index: number) => {
      const startTime = formatTimeVTT(utterance.start);
      const endTime = formatTimeVTT(utterance.end);
      const speakerLabel = utterance.speaker !== undefined ? `Speaker ${utterance.speaker}` : 'Speaker';
      return `${index + 1}\n${startTime} --> ${endTime}\n<v ${speakerLabel}>${utterance.transcript.trim()}</v>\n`;
    }).join('\n');

    // Upload subtitles to blob
    const srtBlob = await put(`transcriptions/${jobId}.srt`, srtContent, {
      access: 'public',
      contentType: 'text/plain'
    });

    const vttBlob = await put(`transcriptions/${jobId}.vtt`, vttContent, {
      access: 'public',
      contentType: 'text/vtt'
    });

    console.log('[AudioProcessor] Subtitles generated');
    await updateTranscriptionProgress(jobId, 90);

    // STEP 7: Generate and save output files
    console.log('[AudioProcessor] Generating output files (Excel, PDF, TXT)...');

    // Generate Excel file with all data
    const { generateAudioExcel } = await import('@/lib/excel-generator');
    const excelBuffer = await generateAudioExcel({
      clientId,
      filename: fileName,
      duration: transcriptionDuration,
      transcription: transcriptionText,
      summary,
      speakers,
      tags,
      hasSRT: true,
      hasVTT: true,
      language: jobLanguage || 'auto',
      processingDate: new Date()
    });

    const excelBlob = await put(
      `transcriptions/${jobId}.xlsx`,
      excelBuffer,
      { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

    console.log('[AudioProcessor] Excel generated');

    // Generate PDF with all data (with error handling)
    let pdfBlob: any = null;
    try {
      const { generateAudioPDF } = await import('@/lib/results-pdf-generator');
      const pdfBuffer = await generateAudioPDF({
        clientId,
        filename: fileName,
        duration: transcriptionDuration,
        transcription: transcriptionText,
        summary,
        speakers,
        tags,
        language: jobLanguage || 'auto',
        processingDate: new Date()
      });

      pdfBlob = await put(
        `transcriptions/${jobId}.pdf`,
        pdfBuffer,
        { access: 'public', contentType: 'application/pdf' }
      );

      console.log('[AudioProcessor] PDF generated');
    } catch (pdfError: any) {
      console.error('[AudioProcessor] PDF generation failed (non-fatal):', pdfError.message);
      // PDF generation is not critical, continue without it
    }

    // Save full transcription (TXT)
    const txtBlob = await put(
      `transcriptions/${jobId}.txt`,
      transcriptionText,
      { access: 'public', contentType: 'text/plain' }
    );

    // Save summary (TXT)
    const summaryBlob = await put(
      `transcriptions/${jobId}-summary.txt`,
      summary,
      { access: 'public', contentType: 'text/plain' }
    );

    // Save speakers as JSON
    const speakersBlob = await put(
      `transcriptions/${jobId}-speakers.json`,
      JSON.stringify(speakers, null, 2),
      { access: 'public', contentType: 'application/json' }
    );

    console.log('[AudioProcessor] All output files saved');
    await updateTranscriptionProgress(jobId, 95);

    // STEP 8: Save results to database
    console.log('[AudioProcessor] Saving results to database...');
    await saveTranscriptionResults(jobId, {
      txtUrl: txtBlob.url,
      srtUrl: srtBlob.url,
      vttUrl: vttBlob.url,
      summaryUrl: summaryBlob.url,
      speakersUrl: speakersBlob.url,
      tags: tags,
      duration: Math.round(transcriptionDuration), // Round to integer for DB
      metadata: {
        speakers: speakers,
        segments: transcriptionSegments?.length || 0,
        language: jobLanguage || 'auto',
        promptLanguage: promptLanguage,
        excelUrl: excelBlob.url,
        pdfUrl: pdfBlob?.url || null
      }
    });

    console.log('[AudioProcessor] Results saved to database');
    await updateTranscriptionProgress(jobId, 100);

    // STEP 9: Delete original audio file to save storage costs
    console.log('[AudioProcessor] Deleting original audio file to save storage...');
    try {
      await del(audioUrl);
      console.log('[AudioProcessor] ✅ Original audio file deleted:', audioUrl);
    } catch (deleteError: any) {
      // Don't fail the whole job if deletion fails, just log it
      console.error('[AudioProcessor] ⚠️  Warning: Could not delete original audio file:', deleteError.message);
      console.error('[AudioProcessor] URL:', audioUrl);
    }

    console.log('[AudioProcessor] Processing completed successfully:', jobId);

  } catch (error: any) {
    console.error('[AudioProcessor] Error processing audio:', error);
    await markTranscriptionError(jobId, error.message);
    throw error;
  }
}
