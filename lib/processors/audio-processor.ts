// lib/processors/audio-processor.ts
// Direct audio processing without Inngest
import OpenAI from 'openai';
import { put, del } from '@vercel/blob';
import {
  updateTranscriptionProgress,
  saveTranscriptionResults,
  markTranscriptionError,
  getTranscriptionJob
} from '@/lib/db/transcriptions';

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

    const { audio_url: audioUrl, filename: fileName } = job;

    console.log('[AudioProcessor] Job found:', { jobId, fileName });

    // Update progress: 10%
    await updateTranscriptionProgress(jobId, 10);

    // STEP 1: Download audio
    console.log('[AudioProcessor] Downloading audio:', fileName);
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Error downloading audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Use Node.js 18+ File API for OpenAI compatibility
    const { File } = await import('node:buffer');
    const audioFileForWhisper = new File(
      [audioBuffer],
      fileName,
      {
        type: response.headers.get('content-type') || 'audio/mpeg'
      }
    );

    console.log('[AudioProcessor] Audio downloaded:', {
      size: `${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`,
      type: audioFileForWhisper.type
    });

    await updateTranscriptionProgress(jobId, 20);

    // STEP 2: Transcribe with Whisper
    console.log('[AudioProcessor] Starting Whisper transcription...');
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFileForWhisper,
      model: "whisper-1",
      language: "es",
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"]
    });

    const transcriptionText = transcriptionResponse.text;
    const transcriptionDuration = transcriptionResponse.duration;
    const transcriptionSegments = transcriptionResponse.segments;

    console.log('[AudioProcessor] Transcription completed:', {
      duration: `${transcriptionDuration}s`,
      segments: transcriptionSegments?.length || 0
    });

    await updateTranscriptionProgress(jobId, 50);

    // STEP 3: Identify speakers
    console.log('[AudioProcessor] Identifying speakers...');
    const speakersCompletion = await openai.chat.completions.create({
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
    });

    const speakersResult = JSON.parse(speakersCompletion.choices[0].message.content || '{}');
    const speakers = speakersResult.speakers || [];

    console.log('[AudioProcessor] Speakers identified:', speakers.length);
    await updateTranscriptionProgress(jobId, 65);

    // STEP 4: Generate summary
    console.log('[AudioProcessor] Generating summary...');
    const summaryType = job.metadata?.summaryType || 'detailed';
    const summaryPrompt = summaryType === 'short'
      ? 'Genera un resumen ejecutivo muy breve (maximo 3 parrafos) de esta transcripcion.'
      : 'Genera un resumen detallado y estructurado de esta transcripcion, incluyendo todos los puntos clave discutidos.';

    const summaryCompletion = await openai.chat.completions.create({
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
    });

    const summary = summaryCompletion.choices[0].message.content || '';

    console.log('[AudioProcessor] Summary generated');
    await updateTranscriptionProgress(jobId, 75);

    // STEP 5: Generate tags
    console.log('[AudioProcessor] Generating tags...');
    const tagsCompletion = await openai.chat.completions.create({
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
    });

    const tagsResult = JSON.parse(tagsCompletion.choices[0].message.content || '{}');
    const tags = tagsResult.tags || [];

    console.log('[AudioProcessor] Tags generated:', tags);
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
      filename: fileName,
      duration: transcriptionDuration,
      transcription: transcriptionText,
      summary,
      speakers,
      tags,
      hasSRT: true,
      hasVTT: true,
      language: 'es',
      processingDate: new Date()
    });

    const excelBlob = await put(
      `transcriptions/${jobId}.xlsx`,
      excelBuffer,
      { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

    console.log('[AudioProcessor] Excel generated');

    // Generate PDF with all data
    const { generateAudioPDF } = await import('@/lib/results-pdf-generator');
    const pdfBuffer = await generateAudioPDF({
      filename: fileName,
      duration: transcriptionDuration,
      transcription: transcriptionText,
      summary,
      speakers,
      tags,
      language: 'es',
      processingDate: new Date()
    });

    const pdfBlob = await put(
      `transcriptions/${jobId}.pdf`,
      pdfBuffer,
      { access: 'public', contentType: 'application/pdf' }
    );

    console.log('[AudioProcessor] PDF generated');

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
        language: 'es',
        excelUrl: excelBlob.url,
        pdfUrl: pdfBlob.url
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
