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
import { transcribeWithAssemblyAI, isAssemblyAIAvailable } from '@/lib/transcription/assemblyai-client';

// Inicializacion segura de OpenAI (solo si la key existe)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Threshold for switching to AssemblyAI (25MB = Whisper limit)
const ASSEMBLYAI_THRESHOLD_BYTES = 25 * 1024 * 1024;

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
    name: 'Transcribe Audio with Hybrid (Whisper + AssemblyAI)',
    concurrency: { limit: 5 },
    retries: 2,
    // Increased timeout for large files processed by AssemblyAI (up to 1 hour)
    timeout: '60m'
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
        language: job.language || 'auto'  // ✅ FIX: Extraer language del job
      };
    });

    const { audioUrl, fileName, userId, summaryType, language } = jobData;

    console.log('[transcribe] Iniciando transcripcion:', { jobId, fileName, userId });

    try {
      // ============================================
      // PASO 1: Actualizar progreso inicial
      // ============================================
      await step.run('update-progress-10', async () => {
        await updateTranscriptionProgress(jobId, 10);
      });

      // ============================================
      // PASO 2: Hybrid Transcription (Whisper ≤25MB, AssemblyAI >25MB)
      // ============================================
      const transcriptionResult = await step.run('hybrid-transcribe', async () => {
        // First, check file size with HEAD request
        console.log('[transcribe] Verificando tamaño del archivo...');

        const headResponse = await fetch(audioUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get('content-length');
        const fileSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
        const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

        console.log('[transcribe] Tamaño del archivo:', fileSizeMB, 'MB');

        // Decide which service to use
        const useAssemblyAI = fileSizeBytes > ASSEMBLYAI_THRESHOLD_BYTES && isAssemblyAIAvailable();

        if (useAssemblyAI) {
          // ============================================
          // PATH A: AssemblyAI para archivos >25MB
          // ============================================
          console.log('[transcribe] Usando AssemblyAI (archivo >25MB)');

          await updateTranscriptionProgress(jobId, 20);

          let assemblyResult;
          try {
            console.log('[transcribe] Iniciando transcripción con AssemblyAI...');
            assemblyResult = await transcribeWithAssemblyAI(audioUrl, language || 'auto');
          } catch (assemblyError) {
            console.error('[transcribe] ❌ Error en AssemblyAI:', {
              message: assemblyError.message,
              stack: assemblyError.stack?.substring(0, 500)
            });
            throw new Error(`AssemblyAI transcription error: ${assemblyError.message}`);
          }

          console.log('[transcribe] ✅ Transcripción con AssemblyAI completada:', {
            duration: `${assemblyResult.duration}s`,
            segments: assemblyResult.segments?.length || 0
          });

          // Convert AssemblyAI segments to Whisper-compatible format
          const segments = assemblyResult.segments.map((seg, i) => ({
            id: i,
            start: seg.start,
            end: seg.end,
            text: seg.text
          }));

          return {
            text: assemblyResult.text,
            duration: assemblyResult.duration,
            segments: segments,
            speakers: assemblyResult.speakers,
            summary: assemblyResult.summary,
            provider: 'assemblyai'
          };
        } else {
          // ============================================
          // PATH B: Whisper para archivos ≤25MB
          // ============================================
          if (fileSizeBytes > ASSEMBLYAI_THRESHOLD_BYTES) {
            console.warn('[transcribe] ⚠️ Archivo >25MB pero AssemblyAI no disponible - intentando con Whisper (puede fallar)');
          } else {
            console.log('[transcribe] Usando OpenAI Whisper (archivo ≤25MB)');
          }

          console.log('[transcribe] Descargando audio:', fileName);

          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`Error descargando audio: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);

          console.log('[transcribe] Audio descargado:', {
            size: `${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
          });

          await updateTranscriptionProgress(jobId, 20);

          const { File } = await import('node:buffer');
          const audioFile = new File(
            [audioBuffer],
            fileName,
            { type: response.headers.get('content-type') || 'audio/mpeg' }
          );

          console.log('[transcribe] Iniciando transcripcion con Whisper...');

          const transcriptionParams = {
            file: audioFile,
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["segment", "word"]
          };

          if (language && language !== 'auto') {
            transcriptionParams.language = language;
            console.log('[transcribe] Usando idioma especificado:', language);
          } else {
            console.log('[transcribe] Usando detección automática de idioma');
          }

          const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionParams);

          console.log('[transcribe] Transcripcion con Whisper completada:', {
            duration: `${transcriptionResponse.duration}s`,
            segments: transcriptionResponse.segments?.length || 0
          });

          return {
            text: transcriptionResponse.text,
            duration: transcriptionResponse.duration,
            segments: transcriptionResponse.segments,
            provider: 'whisper'
          };
        }
      });

      // Extract data from transcription result
      const transcriptionText = transcriptionResult.text;
      const transcriptionDuration = transcriptionResult.duration;
      const transcriptionSegments = transcriptionResult.segments;
      const transcriptionProvider = transcriptionResult.provider;
      const assemblyAISpeakers = transcriptionResult.speakers;
      const assemblyAISummary = transcriptionResult.summary;

      console.log('[transcribe] Usando proveedor:', transcriptionProvider);

      await step.run('update-progress-50', async () => {
        await updateTranscriptionProgress(jobId, 50);
      });

      // ============================================
      // PASO 3: PARALELIZAR análisis con GPT (speakers, resumen, tags)
      // ✅ OPTIMIZACIÓN: Ejecutar las 3 llamadas en paralelo para reducir tiempo
      // ============================================
      const analysisResult = await step.run('parallel-gpt-analysis', async () => {
        console.log('[transcribe] Iniciando análisis paralelo (speakers, resumen, tags)...');

        // Ejecutar las 3 llamadas a GPT en paralelo
        const [speakersCompletion, summaryCompletion, tagsCompletion] = await Promise.all([
          // 1. Identificar speakers
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

          // 2. Generar resumen
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Eres un asistente experto en generar resumenes de transcripciones.
${summaryType === 'short'
  ? 'Genera un resumen ejecutivo muy breve (maximo 3 parrafos) de esta transcripcion.'
  : 'Genera un resumen detallado y estructurado de esta transcripcion, incluyendo todos los puntos clave discutidos.'}

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original
- IMPORTANTE: Genera el resumen en el MISMO IDIOMA que la transcripcion original`
              },
              {
                role: "user",
                content: `Transcripcion:\n\n${transcriptionText}`
              }
            ],
            temperature: 0.5,
            max_tokens: summaryType === 'short' ? 500 : 2000
          }),

          // 3. Generar tags
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
- En el MISMO IDIOMA que la transcripcion original
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

        // Procesar resultados
        const speakersData = JSON.parse(speakersCompletion.choices[0].message.content);
        const speakers = speakersData.speakers || [];

        const summary = summaryCompletion.choices[0].message.content;

        const tagsData = JSON.parse(tagsCompletion.choices[0].message.content);
        const tags = tagsData.tags || [];

        console.log('[transcribe] ✅ Análisis paralelo completado:', {
          speakers: speakers.length,
          summaryLength: summary?.length || 0,
          tags: tags.length
        });

        return { speakers, summary, tags };
      });

      // Extraer resultados del análisis paralelo
      const speakers = analysisResult.speakers;
      const summary = analysisResult.summary;
      const tags = analysisResult.tags;

      // ============================================
      // PASO 4: Generar subtítulos y guardar archivos (consolidado)
      // ✅ OPTIMIZACIÓN: Combinar generación de subtítulos y guardado de archivos
      // ============================================
      const filesResult = await step.run('generate-and-save-files', async () => {
        console.log('[transcribe] Generando subtítulos y guardando archivos...');

        await updateTranscriptionProgress(jobId, 75);

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

        await updateTranscriptionProgress(jobId, 85);

        // Subir TODOS los archivos en paralelo
        const [srtBlob, vttBlob, txtBlob, summaryBlob, speakersBlob] = await Promise.all([
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
          // Format speakers as readable text instead of JSON
          put(`transcriptions/${jobId}-speakers.txt`,
            speakers.length > 0
              ? speakers.map((s, i) => `${i + 1}. ${s.name} - ${s.role}`).join('\n')
              : 'No se identificaron oradores en esta transcripción.',
            {
              access: 'public',
              contentType: 'text/plain'
            }
          )
        ]);

        console.log('[transcribe] ✅ Todos los archivos generados y guardados');

        await updateTranscriptionProgress(jobId, 95);

        return {
          subtitles: {
            srt: srtBlob.url,
            vtt: vttBlob.url
          },
          textFiles: {
            txt: txtBlob.url,
            summary: summaryBlob.url,
            speakers: speakersBlob.url
          }
        };
      });

      const subtitles = filesResult.subtitles;
      const textFiles = filesResult.textFiles;

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
            language: language || 'auto'  // ✅ FIX: Usar language variable en vez de 'es' hardcoded
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
