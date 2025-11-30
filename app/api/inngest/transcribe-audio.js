// app/api/inngest/transcribe-audio.js
import { inngest } from '@/lib/inngest/client';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import {
  updateTranscriptionProgress,
  saveTranscriptionResults,
  markTranscriptionError
} from '@/lib/db/transcriptions';
import { TranscriptionJobDB } from '@/lib/db';
import { trackError } from '@/lib/error-tracker';
import {
  getSpeakerIdentificationPrompt,
  getSummaryPrompt,
  getTagGenerationPrompt,
  normalizeLanguageCode
} from '@/lib/prompts/multilingual';

// Inicializacion segura de OpenAI (solo si la key existe)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ============================================
// FUNCIONES HELPER PARA SUBTITULOS
// ============================================
function formatTimeSRT(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function formatTimeVTT(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

// ============================================
// FUNCION PRINCIPAL DE TRANSCRIPCION
// ============================================
const transcribeFile = inngest.createFunction(
  {
    id: 'transcribe-audio-whisper',
    name: 'Transcribe Audio with OpenAI Whisper',
    concurrency: { limit: 5 },
    retries: 3,
    timeout: '15m'
  },
  { event: 'audio/transcribe.requested' },
  async ({ event, step }) => {

    const { jobId } = event.data;

    // Obtener datos del job desde la BD (dentro de un step para manejo de errores)
    const jobData = await step.run('fetch-job-data', async () => {
      const job = await TranscriptionJobDB.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} no encontrado en la base de datos`);
      }

      console.log('[transcribe] Job encontrado:', { jobId, filename: job.filename, language: job.language });

      return {
        audioUrl: job.audio_url,
        fileName: job.filename,
        userId: job.user_id,
        summaryType: job.metadata?.summaryType || 'detailed',
        language: job.language || 'auto'
      };
    });

    const { audioUrl, fileName, userId, summaryType, language } = jobData;

    // Normalizar idioma para los prompts (si es 'auto', usamos 'es' como default para prompts)
    const promptLanguage = normalizeLanguageCode(language);

    console.log('[transcribe] Iniciando transcripcion:', { jobId, fileName, userId, language, promptLanguage });

    try {
      // ============================================
      // PASO 1: Actualizar progreso inicial
      // ============================================
      await step.run('update-progress-10', async () => {
        await updateTranscriptionProgress(jobId, 10);
      });

      // ============================================
      // PASO 2: Transcribir con Whisper (descarga + transcripción en un solo step)
      // ============================================
      // 🔥 FIX: Descargar Y transcribir en el MISMO step para evitar problemas de scope
      const whisperResult = await step.run('whisper-transcribe', async () => {
        console.log('[transcribe] Descargando audio:', fileName);

        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Error descargando audio: ${response.status}`);
        }

        // Obtener el buffer del audio
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        console.log('[transcribe] Audio descargado:', {
          size: `${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
        });

        // Actualizar progreso a 20% después de descargar
        await updateTranscriptionProgress(jobId, 20);

        // Usar File de Node.js 18+ (compatible con OpenAI SDK)
        const { File } = await import('node:buffer');

        const audioFile = new File(
          [audioBuffer],
          fileName,
          {
            type: response.headers.get('content-type') || 'audio/mpeg'
          }
        );

        console.log('[transcribe] Iniciando transcripcion con Whisper...', { language });

        // Configurar parámetros de transcripción
        const transcriptionParams = {
          file: audioFile,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment", "word"]
        };

        // Solo añadir idioma si no es 'auto' (detección automática)
        if (language && language !== 'auto') {
          transcriptionParams.language = language;
          console.log('[transcribe] Usando idioma especificado:', language);
        } else {
          console.log('[transcribe] Usando detección automática de idioma');
        }

        const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionParams);

        console.log('[transcribe] Transcripcion completada:', {
          duration: `${transcriptionResponse.duration}s`,
          segments: transcriptionResponse.segments?.length || 0
        });

        // Return data needed for next steps
        return {
          text: transcriptionResponse.text,
          duration: transcriptionResponse.duration,
          segments: transcriptionResponse.segments
        };
      });

      // Extract data from whisper result
      const transcriptionText = whisperResult.text;
      const transcriptionDuration = whisperResult.duration;
      const transcriptionSegments = whisperResult.segments;

      await step.run('update-progress-50', async () => {
        await updateTranscriptionProgress(jobId, 50);
      });

      // ============================================
      // PASO 3: Identificar speakers
      // ============================================
      const speakersResult = await step.run('identify-speakers', async () => {
        console.log('[transcribe] Identificando intervinientes...', { language: promptLanguage });

        const completion = await openai.chat.completions.create({
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
        });

        const result = JSON.parse(completion.choices[0].message.content);
        const speakers = result.speakers || [];

        console.log('[transcribe] Intervinientes identificados:', speakers.length);
        return { speakers };
      });

      const speakers = speakersResult.speakers;

      await step.run('update-progress-65', async () => {
        await updateTranscriptionProgress(jobId, 65);
      });

      // ============================================
      // PASO 4: Generar resumen
      // ============================================
      const summaryResult = await step.run('generate-summary', async () => {
        console.log('[transcribe] Generando resumen...', { language: promptLanguage, summaryType });

        const { systemPrompt } = getSummaryPrompt(promptLanguage, summaryType);

        const completion = await openai.chat.completions.create({
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
        });

        const summary = completion.choices[0].message.content;

        console.log('[transcribe] Resumen generado');
        return { summary };
      });

      const summary = summaryResult.summary;

      await step.run('update-progress-75', async () => {
        await updateTranscriptionProgress(jobId, 75);
      });

      // ============================================
      // PASO 5: Generar tags
      // ============================================
      const tagsResult = await step.run('generate-tags', async () => {
        console.log('[transcribe] Generando tags...', { language: promptLanguage });

        const completion = await openai.chat.completions.create({
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
        });

        const result = JSON.parse(completion.choices[0].message.content);
        const tags = result.tags || [];

        console.log('[transcribe] Tags generados:', tags);
        return { tags };
      });

      const tags = tagsResult.tags;

      await step.run('update-progress-85', async () => {
        await updateTranscriptionProgress(jobId, 85);
      });

      // ============================================
      // PASO 6: Generar subtitulos SRT y VTT
      // ============================================
      const subtitlesResult = await step.run('generate-subtitles', async () => {
        console.log('[transcribe] Generando subtitulos...');

        const segments = transcriptionSegments || [];

        // Generar SRT
        const srtContent = segments.map((segment, index) => {
          const startTime = formatTimeSRT(segment.start);
          const endTime = formatTimeSRT(segment.end);
          return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
        }).join('\n');

        // Generar VTT
        const vttContent = 'WEBVTT\n\n' + segments.map((segment, index) => {
          const startTime = formatTimeVTT(segment.start);
          const endTime = formatTimeVTT(segment.end);
          return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
        }).join('\n');

        // Subir archivos
        const srtBlob = await put(`transcriptions/${jobId}.srt`, srtContent, {
          access: 'public',
          contentType: 'text/plain'
        });

        const vttBlob = await put(`transcriptions/${jobId}.vtt`, vttContent, {
          access: 'public',
          contentType: 'text/vtt'
        });

        console.log('[transcribe] Subtitulos generados');

        const subtitles = {
          srt: srtBlob.url,
          vtt: vttBlob.url
        };

        return { subtitles }; // 🔥 FIX: Retornar subtitles
      });

      const subtitles = subtitlesResult.subtitles;

      await step.run('update-progress-90', async () => {
        await updateTranscriptionProgress(jobId, 90);
      });

      // ============================================
      // PASO 7: Guardar archivos de texto
      // ============================================
      const textFilesResult = await step.run('save-text-files', async () => {
        console.log('[transcribe] Guardando archivos de texto...');

        // Guardar transcripcion completa
        const txtBlob = await put(
          `transcriptions/${jobId}.txt`,
          transcriptionText,
          { access: 'public', contentType: 'text/plain' }
        );

        // Guardar resumen
        const summaryBlob = await put(
          `transcriptions/${jobId}-summary.txt`,
          summary,
          { access: 'public', contentType: 'text/plain' }
        );

        // Guardar speakers como JSON
        const speakersBlob = await put(
          `transcriptions/${jobId}-speakers.json`,
          JSON.stringify(speakers, null, 2),
          { access: 'public', contentType: 'application/json' }
        );

        console.log('[transcribe] Archivos de texto guardados');

        const textFiles = {
          txt: txtBlob.url,
          summary: summaryBlob.url,
          speakers: speakersBlob.url
        };

        return { textFiles }; // 🔥 FIX: Retornar textFiles
      });

      const textFiles = textFilesResult.textFiles;

      await step.run('update-progress-95', async () => {
        await updateTranscriptionProgress(jobId, 95);
      });

      // ============================================
      // PASO 8: Guardar resultados en BD
      // ============================================
      await step.run('save-results', async () => {
        console.log('[transcribe] Guardando resultados en BD...');

        await saveTranscriptionResults(jobId, {
          txtUrl: textFiles.txt,
          srtUrl: subtitles.srt,
          vttUrl: subtitles.vtt,
          summaryUrl: textFiles.summary,
          speakersUrl: textFiles.speakers,
          tags: tags,
          duration: transcriptionDuration,
          metadata: {
            speakers: speakers,
            segments: transcriptionSegments?.length || 0,
            language: language || 'auto',
            promptLanguage: promptLanguage
          }
        });

        console.log('[transcribe] Resultados guardados en BD');
        return { success: true };
      });

      await step.run('update-progress-100', async () => {
        await updateTranscriptionProgress(jobId, 100);
      });

      console.log('[transcribe] Transcripcion completada:', jobId);

      return {
        success: true,
        jobId,
        duration: transcriptionDuration
      };

    } catch (error) {
      console.error('[transcribe] Error en transcripcion:', error);
      await markTranscriptionError(jobId, error.message);

      // Track error en sistema de monitoreo
      await trackError(
        'transcription_error',
        'critical',
        error.message || 'Error desconocido en transcripción de audio',
        error,
        {
          userId: jobData.userId,
          metadata: {
            jobId,
            fileName: jobData.fileName,
            audioUrl: jobData.audioUrl,
            summaryType: jobData.summaryType,
          }
        }
      );

      throw error;
    }
  }
);

// Exportar por defecto
export default transcribeFile;
