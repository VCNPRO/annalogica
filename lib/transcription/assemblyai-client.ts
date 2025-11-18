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
 * Filter out common watermarks and unwanted text from transcription
 */
function filterWatermarks(text: string): string {
  // Common watermarks to remove
  const watermarks = [
    /Subtítulos\s+a\s+parte\s+de\s+la\s+comunidad\s+de\s+Amara\.org\.?/gi,
    /Subtítulos\s+por\s+la\s+comunidad\s+de\s+Amara\.org\.?/gi,
    /Amara\.org\s+subtitles\.?/gi,
    /Subtitles\s+by\s+the\s+Amara\.org\s+community\.?/gi,
  ];

  let filtered = text;
  for (const watermark of watermarks) {
    filtered = filtered.replace(watermark, '');
  }

  // Clean up multiple spaces and newlines
  filtered = filtered.replace(/\n{3,}/g, '\n\n').replace(/\s{2,}/g, ' ').trim();

  return filtered;
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

  // Languages that support summarization and auto_highlights
  // These features are primarily available for English
  const supportedLanguagesForAdvancedFeatures = ['en', 'en_us', 'en_uk', 'en_au'];
  const supportsAdvancedFeatures = language && supportedLanguagesForAdvancedFeatures.includes(language.toLowerCase());

  // Prepare transcription params
  const params: any = {
    audio_url: audioUrl,

    // Enable speaker detection (diarization) - works for all languages
    speaker_labels: true,
  };

  // Only enable summarization and auto_highlights for supported languages
  // These features are NOT available when using automatic language detection
  if (supportsAdvancedFeatures) {
    params.summarization = true;
    params.summary_model = 'informative';
    params.summary_type = 'bullets';
    params.auto_highlights = true;
    console.log('[AssemblyAI] Advanced features enabled (summarization, auto_highlights)');
  } else {
    console.log('[AssemblyAI] Advanced features disabled (not supported for this language or auto-detection)');
  }

  // Set language (auto-detect or specific)
  if (language && language !== 'auto') {
    params.language_code = language;
    console.log('[AssemblyAI] Using specified language:', language);
  } else {
    // Use language_detection for automatic detection
    params.language_detection = true;
    console.log('[AssemblyAI] Using automatic language detection');
  }

  // Submit transcription job with extended polling timeout
  // For large files (up to 5GB), transcription can take 15-30+ minutes
  console.log('[AssemblyAI] Submitting transcription job...');

  let transcript;
  try {
    transcript = await client.transcripts.transcribe(params);
  } catch (transcribeError: any) {
    console.error('[AssemblyAI] Transcription API error:', {
      message: transcribeError.message,
      code: transcribeError.code,
      status: transcribeError.status
    });
    throw new Error(`AssemblyAI API error: ${transcribeError.message || 'Unknown error'}`);
  }

  // Check for errors
  if (transcript.status === 'error') {
    console.error('[AssemblyAI] Transcription failed:', transcript.error);
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

  // Filter watermarks from text and summary
  const filteredText = filterWatermarks(transcript.text || '');
  const filteredSummary = filterWatermarks(transcript.summary || '');

  // Also filter segments/utterances text
  const filteredSegments = (transcript.utterances || []).map((utterance: any) => ({
    ...utterance,
    text: filterWatermarks(utterance.text || '')
  })).filter((seg: any) => seg.text && seg.text.trim().length > 0);

  console.log('[AssemblyAI] Watermarks filtered from transcription');

  // Return formatted result
  return {
    text: filteredText,
    duration: transcript.audio_duration || 0,
    speakers: speakers,
    summary: filteredSummary,
    segments: filteredSegments
  };
}

/**
 * Check if AssemblyAI is available (API key configured)
 */
export function isAssemblyAIAvailable(): boolean {
  return !!client;
}
