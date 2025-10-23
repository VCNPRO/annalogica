// app/api/inngest/transcribe-audio.js
import { inngest } from '@/lib/inngest/client';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import {
  updateTranscriptionProgress,
  saveTranscriptionResults,
  markTranscriptionError
} from '@/lib/db/transcriptions';

// Inicialización segura de OpenAI (solo si la key existe)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ============================================
// FUNCIONES HELPER PARA SUBTÍTULOS
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
// FUNCIÓN PRINCIPAL DE TRANSCRIPCIÓN
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
    
    const { jobId, audioUrl, fileName, userId, summaryType = 'detailed' } = event.data;
    
    try {
      // ============================================
      // PASO 1: Descargar audio
      // ============================================
      const audioFile = await step.run('download-audio', async () => {
        console.log('📥 Descargando audio:', fileName);
        
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Error descargando audio: ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], fileName, { 
          type: response.headers.get('content-type') || 'audio/mpeg'
        });
        
        console.log('✅ Audio descargado:', {
          size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.type
        });
        
        return file;
      });

      await updateTranscriptionProgress(jobId, 20);

      // ============================================
      // PASO 2: Transcribir con Whisper
      // ============================================
      const transcription = await step.run('whisper-transcribe', async () => {
        console.log('🎤 Iniciando transcripción con Whisper...');
        
        const response = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "es",
          response_format: "verbose_json",
          timestamp_granularities: ["segment", "word"]
        });
        
        console.log('✅ Transcripción completada:', {
          duration: `${response.duration}s`,
          segments: response.segments?.length || 0
        });
        
        return response;
      });

      await updateTranscriptionProgress(jobId, 50);

      // ============================================
      // PASO 3: Identificar speakers
      // ============================================
      const speakers = await step.run('identify-speakers', async () => {
        console.log('👥 Identificando intervinientes...');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Eres un asistente experto en análisis de transcripciones.
Identifica a todos los intervinientes/oradores en la transcripción.

Para cada interviniente, extrae:
- Nombre completo
- Cargo/rol/descripción (si se menciona)

Responde SOLO con un JSON array:
{"speakers": [
  {"name": "Juan Pérez", "role": "Director General"},
  {"name": "María García", "role": "Responsable de Marketing"}
]}

Si no se menciona el cargo, usa "Interviniente" como role.
Si no hay indicadores claros de speakers, devuelve array vacío.`
            },
            {
              role: "user",
              content: `Transcripción:\n\n${transcription.text}`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
        
        const result = JSON.parse(completion.choices[0].message.content);
        const speakersList = result.speakers || [];
        
        console.log('✅ Intervinientes identificados:', speakersList.length);
        return speakersList;
      });

      await updateTranscriptionProgress(jobId, 65);

      // ============================================
      // PASO 4: Generar resumen
      // ============================================
      const summary = await step.run('generate-summary', async () => {
        console.log('📝 Generando resumen...');
        
        const summaryPrompt = summaryType === 'short' 
          ? 'Genera un resumen ejecutivo muy breve (máximo 3 párrafos) de esta transcripción.'
          : 'Genera un resumen detallado y estructurado de esta transcripción, incluyendo todos los puntos clave discutidos.';
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Eres un asistente experto en generar resúmenes de transcripciones.
${summaryPrompt}

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original`
            },
            {
              role: "user",
              content: `Transcripción:\n\n${transcription.text}`
            }
          ],
          temperature: 0.5,
          max_tokens: summaryType === 'short' ? 500 : 2000
        });
        
        const summaryText = completion.choices[0].message.content;
        
        console.log('✅ Resumen generado');
        return summaryText;
      });

      await updateTranscriptionProgress(jobId, 75);

      // ============================================
      // PASO 5: Generar tags
      // ============================================
      const tags = await step.run('generate-tags', async () => {
        console.log('🏷️ Generando tags...');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Eres un asistente experto en categorización.
Analiza la transcripción y genera entre 5 y 10 tags relevantes.

Los tags deben ser:
- Palabras clave o frases cortas (1-3 palabras)
- Relevantes al contenido principal
- En español
- Sin símbolos especiales

Responde SOLO con JSON:
{"tags": ["tag1", "tag2", "tag3"]}`
            },
            {
              role: "user",
              content: `Transcripción:\n\n${transcription.text}`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
        
        const result = JSON.parse(completion.choices[0].message.content);
        const tagsList = result.tags || [];
        
        console.log('✅ Tags generados:', tagsList);
        return tagsList;
      });

      await updateTranscriptionProgress(jobId, 85);

      // ============================================
      // PASO 6: Generar subtítulos SRT y VTT
      // ============================================
      const subtitles = await step.run('generate-subtitles', async () => {
        console.log('📄 Generando subtítulos...');
        
        const segments = transcription.segments || [];
        
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
        
        console.log('✅ Subtítulos generados');
        
        return {
          srt: srtBlob.url,
          vtt: vttBlob.url
        };
      });

      await updateTranscriptionProgress(jobId, 90);

      // ============================================
      // PASO 7: Guardar archivos de texto
      // ============================================
      const textFiles = await step.run('save-text-files', async () => {
        console.log('💾 Guardando archivos de texto...');
        
        // Guardar transcripción completa
        const txtBlob = await put(
          `transcriptions/${jobId}.txt`,
          transcription.text,
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
        
        console.log('✅ Archivos de texto guardados');
        
        return {
          txt: txtBlob.url,
          summary: summaryBlob.url,
          speakers: speakersBlob.url
        };
      });

      await updateTranscriptionProgress(jobId, 95);

      // ============================================
      // PASO 8: Guardar resultados en BD
      // ============================================
      await step.run('save-results', async () => {
        console.log('💾 Guardando resultados en BD...');
        
        await saveTranscriptionResults(jobId, {
          txtUrl: textFiles.txt,
          srtUrl: subtitles.srt,
          vttUrl: subtitles.vtt,
          summaryUrl: textFiles.summary,
          speakersUrl: textFiles.speakers,
          tags: tags,
          duration: transcription.duration,
          metadata: {
            speakers: speakers,
            segments: transcription.segments?.length || 0,
            language: 'es'
          }
        });
        
        console.log('✅ Resultados guardados en BD');
      });

      await updateTranscriptionProgress(jobId, 100);

      console.log('🎉 Transcripción completada:', jobId);
      
      return { 
        success: true, 
        jobId,
        duration: transcription.duration
      };
      
    } catch (error) {
      console.error('❌ Error en transcripción:', error);
      await markTranscriptionError(jobId, error.message);
      throw error;
    }
  }
);

// Exportar por defecto
export default transcribeFile;
