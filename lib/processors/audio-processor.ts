// lib/processors/audio-processor.ts
// Direct audio processing without Inngest
import OpenAI from 'openai';
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

    // STEP 1: Download audio
    console.log('[AudioProcessor] Downloading audio:', fileName);
    let audioFileForWhisper: any;
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        const errorMsg = `Failed to download audio: HTTP ${response.status} ${response.statusText}`;
        await trackError(
          'audio_download_failed',
          'high',
          errorMsg,
          new Error(errorMsg),
          {
            userId,
            metadata: {
              jobId,
              fileName,
              audioUrl: audioUrl.substring(0, 100),
              httpStatus: response.status,
              httpStatusText: response.statusText,
              step: 'STEP 1: Download Audio'
            }
          }
        );
        throw new Error(errorMsg);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      // Use Node.js 18+ File API for OpenAI compatibility
      const { File } = await import('node:buffer');
      audioFileForWhisper = new File(
        [audioBuffer],
        fileName,
        {
          type: response.headers.get('content-type') || 'audio/mpeg'
        }
      );

      const audioSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
      console.log('[AudioProcessor] ✅ Audio downloaded:', {
        size: `${audioSizeMB} MB`,
        type: audioFileForWhisper.type
      });

      await updateTranscriptionProgress(jobId, 20);
    } catch (error: any) {
      const errorMsg = `Audio download failed: ${error.message}`;
      await trackError(
        'audio_download_error',
        'critical',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName,
            audioUrl: audioUrl.substring(0, 100),
            step: 'STEP 1: Download Audio',
            errorType: error.constructor.name
          }
        }
      );
      await markTranscriptionError(jobId, errorMsg);
      throw new Error(errorMsg);
    }

    // STEP 2: Transcribe with Whisper
    console.log('[AudioProcessor] Starting Whisper transcription...');
    let transcriptionText: string;
    let transcriptionDuration: number;
    let transcriptionSegments: any[];

    try {
      // Build transcription params
      const transcriptionParams: any = {
        file: audioFileForWhisper,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment", "word"]
      };

      // Only add language if not auto-detection
      if (jobLanguage && jobLanguage !== 'auto') {
        transcriptionParams.language = jobLanguage;
        console.log('[AudioProcessor] Using specified language:', jobLanguage);
      } else {
        console.log('[AudioProcessor] Using automatic language detection');
      }

      const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionParams) as any;

      transcriptionText = transcriptionResponse.text;
      transcriptionDuration = transcriptionResponse.duration;
      transcriptionSegments = transcriptionResponse.segments;

      console.log('[AudioProcessor] ✅ Transcription completed:', {
        duration: `${transcriptionDuration}s`,
        segments: transcriptionSegments?.length || 0,
        textLength: transcriptionText.length
      });

      await updateTranscriptionProgress(jobId, 50);
    } catch (error: any) {
      const errorMsg = `Whisper transcription failed: ${error.message}`;
      await trackError(
        'whisper_transcription_error',
        'critical',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName,
            audioSizeMB: audioFileForWhisper?.size ? (audioFileForWhisper.size / 1024 / 1024).toFixed(2) : 'unknown',
            audioType: audioFileForWhisper?.type,
            language: jobLanguage,
            step: 'STEP 2: Whisper Transcription',
            errorType: error.constructor.name,
            openAIError: error.response?.data || error.message
          }
        }
      );
      await markTranscriptionError(jobId, errorMsg);
      throw new Error(errorMsg);
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

    // STEP 6: Generate subtitles (SRT and VTT)
    console.log('[AudioProcessor] Generating subtitles...');
    const segments = transcriptionSegments || [];

    // Generate SRT
    const srtContent = segments.map((segment: any, index: number) => {
      const startTime = formatTimeSRT(segment.start);
      const endTime = formatTimeSRT(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
    }).join('\n');

    // Generate VTT
    const vttContent = 'WEBVTT\n\n' + segments.map((segment: any, index: number) => {
      const startTime = formatTimeVTT(segment.start);
      const endTime = formatTimeVTT(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
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
