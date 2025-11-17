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

    console.log('[AudioProcessor] Job found:', { jobId, fileName, language: jobLanguage });

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

    // STEP 3: PARALLEL GPT Analysis (speakers, summary, tags)
    // ✅ OPTIMIZATION: Execute all 3 GPT calls in parallel to reduce processing time
    console.log('[AudioProcessor] Starting parallel GPT analysis (speakers, summary, tags)...');

    const summaryType = job.metadata?.summaryType || 'detailed';
    const summaryPrompt = summaryType === 'short'
      ? 'Genera un resumen ejecutivo muy breve (maximo 3 parrafos) de esta transcripcion.'
      : 'Genera un resumen detallado y estructurado de esta transcripcion, incluyendo todos los puntos clave discutidos.';

    const [speakersCompletion, summaryCompletion, tagsCompletion] = await Promise.all([
      // 1. Identify speakers
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en analisis de transcripciones.
Identifica a todos los intervinientes/oradores en la transcripcion.

Para cada interviniente, extrae:
- Nombre completo
- Cargo/rol/descripcion (si se menciona)

Responde SOLO con un JSON array:
{"speakers": [
  {"name": "Juan Perez", "role": "Director General"},
  {"name": "Maria Garcia", "role": "Responsable de Marketing"}
]}

Si no se menciona el cargo, usa "Interviniente" como role.
Si no hay indicadores claros de speakers, devuelve array vacio.`
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${transcriptionText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),

      // 2. Generate summary
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en generar resumenes de transcripciones.
${summaryPrompt}

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original`
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${transcriptionText}`
          }
        ],
        temperature: 0.5,
        max_tokens: summaryType === 'short' ? 500 : 2000
      }),

      // 3. Generate tags
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en categorizacion.
Analiza la transcripcion y genera entre 5 y 10 tags relevantes.

Los tags deben ser:
- Palabras clave o frases cortas (1-3 palabras)
- Relevantes al contenido principal
- En espanol
- Sin simbolos especiales

Responde SOLO con JSON:
{"tags": ["tag1", "tag2", "tag3"]}`
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

    // Process results
    const speakersResult = JSON.parse(speakersCompletion.choices[0].message.content || '{}');
    const speakers = speakersResult.speakers || [];

    const summary = summaryCompletion.choices[0].message.content || '';

    const tagsResult = JSON.parse(tagsCompletion.choices[0].message.content || '{}');
    const tags = tagsResult.tags || [];

    console.log('[AudioProcessor] ✅ Parallel GPT analysis completed:', {
      speakers: speakers.length,
      summaryLength: summary.length,
      tags: tags.length
    });
    await updateTranscriptionProgress(jobId, 75);

    // STEP 4: Generate subtitles and save all files in parallel
    // ✅ OPTIMIZATION: Combine subtitle generation and file uploads
    console.log('[AudioProcessor] Generating subtitles and output files...');
    await updateTranscriptionProgress(jobId, 85);

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

    // Generate PDF with all data (with error handling)
    let pdfBuffer: Buffer | null = null;
    try {
      const { generateAudioPDF } = await import('@/lib/results-pdf-generator');
      pdfBuffer = await generateAudioPDF({
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
    } catch (pdfError: any) {
      console.error('[AudioProcessor] PDF generation failed (non-fatal):', pdfError.message);
      // PDF generation is not critical, continue without it
    }

    // Upload ALL files in parallel for maximum speed
    const uploadPromises = [
      put(`transcriptions/${jobId}.srt`, srtContent, {
        access: 'public',
        contentType: 'text/plain'
      }),
      put(`transcriptions/${jobId}.vtt`, vttContent, {
        access: 'public',
        contentType: 'text/vtt'
      }),
      put(`transcriptions/${jobId}.txt`, transcriptionText, {
        access: 'public',
        contentType: 'text/plain'
      }),
      put(`transcriptions/${jobId}-summary.txt`, summary, {
        access: 'public',
        contentType: 'text/plain'
      }),
      put(`transcriptions/${jobId}-speakers.json`, JSON.stringify(speakers, null, 2), {
        access: 'public',
        contentType: 'application/json'
      }),
      put(`transcriptions/${jobId}.xlsx`, excelBuffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    ];

    // Add PDF upload if it was generated successfully
    if (pdfBuffer) {
      uploadPromises.push(
        put(`transcriptions/${jobId}.pdf`, pdfBuffer, {
          access: 'public',
          contentType: 'application/pdf'
        })
      );
    }

    const uploadResults = await Promise.all(uploadPromises);

    const [srtBlob, vttBlob, txtBlob, summaryBlob, speakersBlob, excelBlob, ...restBlobs] = uploadResults;
    const pdfBlob = pdfBuffer ? restBlobs[0] : null;

    console.log('[AudioProcessor] ✅ All files uploaded successfully');
    await updateTranscriptionProgress(jobId, 95);

    // STEP 5: Save results to database
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
        excelUrl: excelBlob.url,
        pdfUrl: pdfBlob?.url || null
      }
    });

    console.log('[AudioProcessor] Results saved to database');
    await updateTranscriptionProgress(jobId, 100);

    // STEP 6: Delete original audio file to save storage costs
    console.log('[AudioProcessor] Deleting original audio file to save storage...');
    try {
      await del(audioUrl);
      console.log('[AudioProcessor] ✅ Original audio file deleted:', audioUrl);
    } catch (deleteError: any) {
      // Don't fail the whole job if deletion fails, just log it
      console.error('[AudioProcessor] ⚠️  Warning: Could not delete original audio file:', deleteError.message);
      console.error('[AudioProcessor] URL:', audioUrl);
    }

    console.log('[AudioProcessor] ✅ Processing completed successfully:', jobId);

  } catch (error: any) {
    console.error('[AudioProcessor] Error processing audio:', error);
    await markTranscriptionError(jobId, error.message);
    throw error;
  }
}
