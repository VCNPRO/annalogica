// lib/transcription/assemblyai-client.ts
import { AssemblyAI } from 'assemblyai';

// Initialize AssemblyAI client (only if API key is available)
const client = process.env.ASSEMBLYAI_API_KEY
  ? new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY })
  : null;

/**
 * Speaker information from AssemblyAI utterances
 */
export interface Speaker {
  name: string;
  role: string;
}

/**
 * Transcription result from AssemblyAI
 */
export interface AssemblyAIResult {
  text: string;
  duration: number;
  speakers: Speaker[];
  summary: string;
  segments: any[];
}

/**
 * Extract speakers from AssemblyAI utterances
 */
function extractSpeakers(utterances: any[]): Speaker[] {
  if (!utterances || utterances.length === 0) {
    return [];
  }

  const speakersMap = new Map<string, Speaker>();

  utterances.forEach((utterance) => {
    const speakerId = utterance.speaker;
    if (speakerId && !speakersMap.has(speakerId)) {
      speakersMap.set(speakerId, {
        name: `Speaker ${speakerId}`,
        role: 'Interviniente'
      });
    }
  });

  return Array.from(speakersMap.values());
}

/**
 * Transcribe audio file with AssemblyAI
 * Supports files up to 5GB
 *
 * @param audioUrl - Public URL of the audio file
 * @param language - Language code (e.g., 'es', 'en') or 'auto' for auto-detection
 * @returns Transcription result with speakers and summary
 */
export async function transcribeWithAssemblyAI(
  audioUrl: string,
  language: string = 'auto'
): Promise<AssemblyAIResult> {
  if (!client) {
    throw new Error('AssemblyAI API key not configured');
  }

  console.log('[AssemblyAI] Starting transcription:', { audioUrl: audioUrl.substring(0, 100), language });

  // Prepare transcription params
  const params: any = {
    audio_url: audioUrl,

    // Enable speaker detection (diarization)
    speaker_labels: true,

    // Enable automatic summarization
    summarization: true,
    summary_model: 'informative',
    summary_type: 'bullets',

    // Enable automatic highlights/key points
    auto_highlights: true,
  };

  // Set language (auto-detect or specific)
  if (language && language !== 'auto') {
    params.language_code = language;
    console.log('[AssemblyAI] Using specified language:', language);
  } else {
    console.log('[AssemblyAI] Using automatic language detection');
  }

  // Submit transcription job
  const transcript = await client.transcripts.transcribe(params);

  // Check for errors
  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  console.log('[AssemblyAI] Transcription completed:', {
    duration: transcript.audio_duration,
    status: transcript.status,
    hasSummary: !!transcript.summary,
    utterances: transcript.utterances?.length || 0
  });

  // Extract speakers from utterances
  const speakers = extractSpeakers(transcript.utterances || []);

  // Return formatted result
  return {
    text: transcript.text || '',
    duration: transcript.audio_duration || 0,
    speakers: speakers,
    summary: transcript.summary || '',
    segments: transcript.utterances || []
  };
}

/**
 * Check if AssemblyAI is available (API key configured)
 */
export function isAssemblyAIAvailable(): boolean {
  return !!client;
}
