// lib/transcription/hybrid-processor.ts
// Hybrid transcription processor: Uses OpenAI Whisper for small files, AssemblyAI for large files

import OpenAI from 'openai';
import { transcribeWithAssemblyAI, isAssemblyAIAvailable } from './assemblyai-client';
import { FILE_CONSTANTS } from '@/constants/processing';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface HybridTranscriptionResult {
  text: string;
  duration: number;
  speakers: Array<{ name: string; role: string }>;
  summary: string;
  tags: string[];
  segments: any[];
  provider: 'whisper' | 'assemblyai';
}

/**
 * Decide which transcription service to use based on file size
 */
function shouldUseAssemblyAI(fileSizeBytes: number): boolean {
  // If file is larger than 25MB, use AssemblyAI (Whisper limit)
  if (fileSizeBytes > FILE_CONSTANTS.ASSEMBLYAI_THRESHOLD_BYTES) {
    return true;
  }

  // For small files, use Whisper (cheaper and faster for small files)
  return false;
}

/**
 * Transcribe with OpenAI Whisper (for files <=25MB)
 */
async function transcribeWithWhisper(
  audioFile: any,
  audioBuffer: Buffer,
  language: string
): Promise<any> {
  console.log('[HybridProcessor] Using OpenAI Whisper for transcription');

  const transcriptionParams: any = {
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment", "word"]
  };

  // Only add language if not auto-detection
  if (language && language !== 'auto') {
    transcriptionParams.language = language;
  }

  const transcriptionResponse = await openai!.audio.transcriptions.create(transcriptionParams) as any;

  return {
    text: transcriptionResponse.text,
    duration: transcriptionResponse.duration,
    segments: transcriptionResponse.segments
  };
}

/**
 * Hybrid transcription: Automatically choose between Whisper and AssemblyAI
 *
 * @param audioUrl - URL of the audio file
 * @param fileName - Name of the audio file
 * @param language - Language code or 'auto'
 * @param transcriptionText - Optional pre-transcribed text (if already transcribed with Whisper)
 * @param fileSizeBytes - Size of the audio file in bytes
 * @returns Transcription result with speakers, summary, and tags
 */
export async function hybridTranscribe(params: {
  audioUrl: string;
  fileName: string;
  language: string;
  transcriptionText?: string;
  transcriptionDuration?: number;
  transcriptionSegments?: any[];
  fileSizeBytes?: number;
}): Promise<HybridTranscriptionResult> {
  const {
    audioUrl,
    fileName,
    language,
    transcriptionText: preTranscribedText,
    transcriptionDuration: preTranscribedDuration,
    transcriptionSegments: preTranscribedSegments,
    fileSizeBytes = 0
  } = params;

  // If we already have a transcription (from Whisper in audio-processor.ts),
  // we just need to generate speakers, summary, and tags
  if (preTranscribedText && preTranscribedDuration && preTranscribedSegments) {
    console.log('[HybridProcessor] Using pre-transcribed text from Whisper');

    // Generate speakers, summary, and tags with GPT-4o-mini (in parallel)
    const [speakersCompletion, summaryCompletion, tagsCompletion] = await Promise.all([
      // 1. Identify speakers
      openai!.chat.completions.create({
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
            content: `Transcripcion:\n\n${preTranscribedText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),

      // 2. Generate summary
      openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en generar resumenes de transcripciones.
Genera un resumen detallado y estructurado de esta transcripcion, incluyendo todos los puntos clave discutidos.

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original`
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${preTranscribedText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      }),

      // 3. Generate tags
      openai!.chat.completions.create({
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
            content: `Transcripcion:\n\n${preTranscribedText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    ]);

    // Parse results
    const speakersData = JSON.parse(speakersCompletion.choices[0].message.content || '{}');
    const speakers = speakersData.speakers || [];
    const summary = summaryCompletion.choices[0].message.content || '';
    const tagsData = JSON.parse(tagsCompletion.choices[0].message.content || '{}');
    const tags = tagsData.tags || [];

    return {
      text: preTranscribedText,
      duration: preTranscribedDuration,
      speakers,
      summary,
      tags,
      segments: preTranscribedSegments,
      provider: 'whisper'
    };
  }

  // Determine which service to use
  const useAssemblyAI = shouldUseAssemblyAI(fileSizeBytes);

  if (useAssemblyAI && isAssemblyAIAvailable()) {
    // Use AssemblyAI for large files
    console.log('[HybridProcessor] Using AssemblyAI (file >25MB)');

    const result = await transcribeWithAssemblyAI(audioUrl, language);

    // Generate tags with GPT-4o-mini (AssemblyAI doesn't provide tags)
    const tagsCompletion = await openai!.chat.completions.create({
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
          content: `Transcripcion:\n\n${result.text}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const tagsData = JSON.parse(tagsCompletion.choices[0].message.content || '{}');
    const tags = tagsData.tags || [];

    return {
      ...result,
      tags,
      provider: 'assemblyai'
    };
  } else {
    // Use OpenAI Whisper for small files (fallback if AssemblyAI not available)
    console.log('[HybridProcessor] Using OpenAI Whisper (file <=25MB or AssemblyAI not available)');

    // Download audio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Create audio file for Whisper
    const { File } = await import('node:buffer');
    const audioFile = new File(
      [audioBuffer],
      fileName,
      { type: response.headers.get('content-type') || 'audio/mpeg' }
    );

    // Transcribe with Whisper
    const whisperResult = await transcribeWithWhisper(audioFile, audioBuffer, language);

    // Generate speakers, summary, and tags with GPT-4o-mini (in parallel)
    const [speakersCompletion, summaryCompletion, tagsCompletion] = await Promise.all([
      // Speakers
      openai!.chat.completions.create({
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
            content: `Transcripcion:\n\n${whisperResult.text}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),

      // Summary
      openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en generar resumenes de transcripciones.
Genera un resumen detallado y estructurado de esta transcripcion, incluyendo todos los puntos clave discutidos.

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original`
          },
          {
            role: "user",
            content: `Transcripcion:\n\n${whisperResult.text}`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      }),

      // Tags
      openai!.chat.completions.create({
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
            content: `Transcripcion:\n\n${whisperResult.text}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    ]);

    // Parse results
    const speakersData = JSON.parse(speakersCompletion.choices[0].message.content || '{}');
    const speakers = speakersData.speakers || [];
    const summary = summaryCompletion.choices[0].message.content || '';
    const tagsData = JSON.parse(tagsCompletion.choices[0].message.content || '{}');
    const tags = tagsData.tags || [];

    return {
      text: whisperResult.text,
      duration: whisperResult.duration,
      speakers,
      summary,
      tags,
      segments: whisperResult.segments,
      provider: 'whisper'
    };
  }
}
