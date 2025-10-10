import { AssemblyAI } from 'assemblyai';
import { put } from '@vercel/blob';

// Initialize AssemblyAI client
export function getAssemblyAIClient() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is not set');
  }
  return new AssemblyAI({ apiKey });
}

export interface TranscriptionOptions {
  audioUrl: string;
  language?: 'es' | 'en' | 'auto';
  speakerLabels?: boolean;
  dualChannel?: boolean;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  words: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  utterances?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
  }>;
  audioDuration: number;
}

/**
 * Transcribe audio using AssemblyAI
 * Uses polling to wait for completion (async-friendly)
 */
export async function transcribeAudio(
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const client = getAssemblyAIClient();

  console.log('[AssemblyAI] Starting transcription for:', options.audioUrl);

  // Submit transcription job
  const transcript = await client.transcripts.transcribe({
    audio_url: options.audioUrl,
    language_code: options.language === 'es' ? 'es' : undefined,
    language_detection: options.language === 'auto',
    speaker_labels: options.speakerLabels ?? true, // Enable by default
    dual_channel: options.dualChannel ?? false,

    // Enable key phrases only for English (not available in Spanish)
    auto_highlights: options.language === 'en' || options.language === 'auto',
  });

  console.log('[AssemblyAI] Transcription completed:', transcript.id);
  console.log('[AssemblyAI] Status:', transcript.status);

  // Check for errors
  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  if (!transcript.text) {
    throw new Error('AssemblyAI returned empty transcription');
  }

  // Return structured result
  return {
    id: transcript.id,
    text: transcript.text,
    words: transcript.words?.map(w => ({
      text: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      speaker: w.speaker || undefined
    })) || [],
    utterances: transcript.utterances?.map(u => ({
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
      speaker: u.speaker
    })),
    audioDuration: transcript.audio_duration || 0
  };
}

/**
 * Generate SRT subtitle file from transcript
 */
export function generateSRT(result: TranscriptionResult): string {
  if (!result.utterances || result.utterances.length === 0) {
    // Fallback: Use words if no speaker diarization
    if (result.words.length === 0) {
      return '';
    }

    let srt = '';
    const wordsPerSubtitle = 10;
    for (let i = 0; i < result.words.length; i += wordsPerSubtitle) {
      const chunk = result.words.slice(i, i + wordsPerSubtitle);
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const text = chunk.map(w => w.text).join(' ');

      srt += `${Math.floor(i / wordsPerSubtitle) + 1}\n`;
      srt += `${formatTimestamp(start)} --> ${formatTimestamp(end)}\n`;
      srt += `${text}\n\n`;
    }
    return srt;
  }

  // Use utterances (speaker-aware)
  let srt = '';
  result.utterances.forEach((utterance, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatTimestamp(utterance.start)} --> ${formatTimestamp(utterance.end)}\n`;

    // Include speaker label
    const speaker = utterance.speaker || 'Speaker';
    srt += `[${speaker}] ${utterance.text.trim()}\n\n`;
  });

  return srt;
}

/**
 * Generate VTT subtitle file from transcript
 */
export function generateVTT(result: TranscriptionResult): string {
  const srt = generateSRT(result);
  if (!srt) {
    return 'WEBVTT\n\n';
  }

  // Convert SRT to VTT (replace commas with periods in timestamps)
  const vtt = 'WEBVTT\n\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
}

/**
 * Format timestamp for SRT (HH:MM:SS,mmm)
 */
function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
}

function pad(num: number, size = 2): string {
  return String(num).padStart(size, '0');
}

/**
 * Save transcription results to Vercel Blob
 */
export async function saveTranscriptionResults(
  result: TranscriptionResult,
  filename: string
): Promise<{
  txtUrl: string;
  srtUrl: string;
  vttUrl: string;
}> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  // Save TXT
  const txtBlob = await put(`${baseName}.txt`, result.text, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  // Save SRT
  const srtContent = generateSRT(result);
  const srtBlob = await put(`${baseName}.srt`, srtContent, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  // Save VTT
  const vttContent = generateVTT(result);
  const vttBlob = await put(`${baseName}.vtt`, vttContent, {
    access: 'public',
    contentType: 'text/vtt; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  return {
    txtUrl: txtBlob.url,
    srtUrl: srtBlob.url,
    vttUrl: vttBlob.url
  };
}

export interface SummaryResult {
  summary: string;
  tags: string[];
}

/**
 * Generate summary and tags using Claude API
 */
export async function generateSummary(text: string): Promise<SummaryResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  if (text.length < 100) {
    return { summary: '', tags: [] }; // Skip for very short texts
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Resume el siguiente texto en español en 3-4 párrafos. Después del resumen, añade una sección llamada "Tags:" seguida de una lista de 5-7 tags/categorías principales separadas por comas (por ejemplo: Tags: tecnología, negocios, educación).\n\nTexto:\n${text.slice(0, 8000)}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const fullText = data.content[0].text;

    // Parse summary and tags
    let summary = fullText;
    let tags: string[] = [];

    const tagsMarker = /\n(Tags|Categorías):/i;
    const match = fullText.match(tagsMarker);

    if (match && match.index) {
      summary = fullText.slice(0, match.index).trim();
      const tagsString = fullText.slice(match.index + match[0].length).trim();
      tags = tagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    return { summary, tags };

  } catch (error: any) {
    console.error('[Claude] Summary generation failed:', error.message);
    return { summary: '', tags: [] }; // Don't fail the entire job
  }
}

/**
 * Save summary to Vercel Blob
 */
export async function saveSummary(
  summary: string,
  filename: string
): Promise<string> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  const summaryBlob = await put(`${baseName}-summary.txt`, summary, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  return summaryBlob.url;
}

/**
 * Generate speakers/participants report from transcription
 */
export function generateSpeakersReport(result: TranscriptionResult): string {
  if (!result.utterances || result.utterances.length === 0) {
    return 'No se detectaron oradores en esta transcripción.';
  }

  // Extract unique speakers
  const speakers = [...new Set(result.utterances.map(u => u.speaker))].sort();

  if (speakers.length === 0) {
    return 'No se detectaron oradores en esta transcripción.';
  }

  // Calculate statistics for each speaker
  const speakerStats = speakers.map(speaker => {
    const utterances = result.utterances!.filter(u => u.speaker === speaker);
    const totalWords = utterances.reduce((sum, u) => sum + u.text.split(/\s+/).length, 0);
    const totalDuration = utterances.reduce((sum, u) => sum + (u.end - u.start), 0);
    const interventions = utterances.length;

    return {
      speaker,
      interventions,
      totalWords,
      totalDuration,
      utterances
    };
  });

  // Sort by total duration (most active speaker first)
  speakerStats.sort((a, b) => b.totalDuration - a.totalDuration);

  // Generate report
  let report = '='.repeat(60) + '\n';
  report += 'ANÁLISIS DE ORADORES / INTERVINIENTES\n';
  report += '='.repeat(60) + '\n\n';

  report += `Total de oradores detectados: ${speakers.length}\n`;
  report += `Duración total del audio: ${formatDuration(result.audioDuration)}\n\n`;

  report += '-'.repeat(60) + '\n';
  report += 'RESUMEN POR ORADOR\n';
  report += '-'.repeat(60) + '\n\n';

  speakerStats.forEach((stats, index) => {
    const percentage = ((stats.totalDuration / result.audioDuration) * 100).toFixed(1);

    report += `${index + 1}. ${stats.speaker}\n`;
    report += `   Intervenciones: ${stats.interventions}\n`;
    report += `   Palabras pronunciadas: ${stats.totalWords}\n`;
    report += `   Tiempo total: ${formatDuration(stats.totalDuration)} (${percentage}% del total)\n`;
    report += `   Promedio por intervención: ${formatDuration(stats.totalDuration / stats.interventions)}\n\n`;
  });

  // Detailed timeline
  report += '-'.repeat(60) + '\n';
  report += 'LÍNEA DE TIEMPO DETALLADA\n';
  report += '-'.repeat(60) + '\n\n';

  result.utterances.forEach((utterance, index) => {
    const startTime = formatTimestampSimple(utterance.start);
    const endTime = formatTimestampSimple(utterance.end);
    const duration = formatDuration(utterance.end - utterance.start);

    report += `[${startTime} → ${endTime}] (${duration})\n`;
    report += `${utterance.speaker}: ${utterance.text.trim()}\n\n`;
  });

  return report;
}

/**
 * Format milliseconds to readable duration (MM:SS)
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Format timestamp for simple display (HH:MM:SS)
 */
function formatTimestampSimple(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Save speakers report to Vercel Blob
 */
export async function saveSpeakersReport(
  result: TranscriptionResult,
  filename: string
): Promise<string> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  const report = generateSpeakersReport(result);

  const speakersBlob = await put(`${baseName}-oradores.txt`, report, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  return speakersBlob.url;
}
