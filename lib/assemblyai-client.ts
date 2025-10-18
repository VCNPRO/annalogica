import { AssemblyAI } from 'assemblyai';
import { put, del } from '@vercel/blob';

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
  language?: 'es' | 'en' | 'ca' | 'eu' | 'gl' | 'pt' | 'auto';
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
    language_code: ['es', 'en', 'ca', 'eu', 'gl', 'pt'].includes(options.language || '') ? options.language as ('es' | 'en' | 'ca' | 'eu' | 'gl' | 'pt') : undefined,
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
  filename: string,
  originalFileUrl: string, // Add this parameter
  generateSubtitles: boolean = false // NEW: Control subtitle generation
): Promise<{
  txtUrl: string;
  srtUrl?: string;
  vttUrl?: string;
}> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  // Always save TXT
  const txtBlob = await put(`${baseName}.txt`, result.text, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  const response: { txtUrl: string; srtUrl?: string; vttUrl?: string } = {
    txtUrl: txtBlob.url
  };

  // Conditionally save SRT/VTT only if requested
  if (generateSubtitles) {
    console.log('[Vercel Blob] ✅ Generating subtitles (SRT/VTT) as requested');

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

    response.srtUrl = srtBlob.url;
    response.vttUrl = vttBlob.url;
  } else {
    console.log('[Vercel Blob] ⏭️ Skipping subtitle generation (not requested)');
  }

  return response;

  // Delete original file after successful processing
  try {
    await del(originalFileUrl, { token: blobToken });
    console.log(`[Vercel Blob] Deleted original file: ${originalFileUrl}`);
  } catch (deleteError: any) {
    console.error(`[Vercel Blob] Failed to delete original file ${originalFileUrl}:`, deleteError.message);
  }
}

export interface SummaryResult {
  summary: string;
  tags: string[];
}

/**
 * Generate summary and/or tags using AssemblyAI LeMUR
 */
export async function generateSummaryWithLeMUR(
  transcriptId: string,
  language: string = 'es',
  generateSummary: boolean = true,
  generateTags: boolean = true,
  summaryType: 'short' | 'detailed' = 'detailed'
): Promise<SummaryResult> {
  const client = getAssemblyAIClient();

  try {
    console.log('[LeMUR] Generating content for transcript:', transcriptId, {
      generateSummary,
      generateTags,
      summaryType
    });

    // Build prompt based on what's requested
    let prompt = '';

    // Summary prompts by language and type
    const summaryPromptsShort: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 1-2 párrafos breves (máximo 150 palabras). Sé conciso y directo.',
      'en': 'Summarize the following text in English in 1-2 brief paragraphs (maximum 150 words). Be concise and direct.',
      'ca': 'Resumeix el següent text en català en 1-2 paràgrafs breus (màxim 150 paraules). Sigues concís i directe.',
      'eu': 'Laburtu ondorengo testua euskaraz 1-2 paragrafo laburren (gehienez 150 hitz). Izan zehatza eta zuzena.',
      'gl': 'Resume o seguinte texto en galego en 1-2 parágrafos breves (máximo 150 palabras). Sé conciso e directo.',
      'pt': 'Resume o seguinte texto em português em 1-2 parágrafos breves (máximo 150 palavras). Seja conciso e direto.',
      'fr': 'Résumez le texte suivant en français en 1-2 paragraphes brefs (maximum 150 mots). Soyez concis et direct.',
      'de': 'Fassen Sie den folgenden Text auf Deutsch in 1-2 kurzen Absätzen zusammen (maximal 150 Wörter). Seien Sie prägnant und direkt.',
      'it': 'Riassumi il seguente testo in italiano in 1-2 paragrafi brevi (massimo 150 parole). Sii conciso e diretto.',
    };

    const summaryPromptsDetailed: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 3-4 párrafos detallados. Incluye los puntos clave y contexto relevante.',
      'en': 'Summarize the following text in English in 3-4 detailed paragraphs. Include key points and relevant context.',
      'ca': 'Resumeix el següent text en català en 3-4 paràgrafs detallats. Inclou els punts clau i context rellevant.',
      'eu': 'Laburtu ondorengo testua euskaraz 3-4 paragrafo xehakatutan. Sartu puntu nagusiak eta testuinguru garrantzitsua.',
      'gl': 'Resume o seguinte texto en galego en 3-4 parágrafos detallados. Inclúe os puntos clave e contexto relevante.',
      'pt': 'Resume o seguinte texto em português em 3-4 parágrafos detalhados. Inclua os pontos-chave e contexto relevante.',
      'fr': 'Résumez le texte suivant en français en 3-4 paragraphes détaillés. Incluez les points clés et le contexte pertinent.',
      'de': 'Fassen Sie den folgenden Text auf Deutsch in 3-4 detaillierten Absätzen zusammen. Fügen Sie wichtige Punkte und relevanten Kontext hinzu.',
      'it': 'Riassumi il seguente testo in italiano in 3-4 paragrafi dettagliati. Includi i punti chiave e il contesto rilevante.',
    };

    const tagsPrompts: Record<string, string> = {
      'es': 'Genera una lista de 5-7 tags/categorías principales que describan el contenido, separadas por comas.',
      'en': 'Generate a list of 5-7 main tags/categories that describe the content, separated by commas.',
      'ca': 'Genera una llista de 5-7 etiquetes/categories principals que descriguin el contingut, separades per comes.',
      'eu': 'Sortu edukia deskribatzen duten 5-7 etiketa/kategoria nagusien zerrenda bat, komaz bereizita.',
      'gl': 'Xera unha lista de 5-7 etiquetas/categorías principais que describan o contido, separadas por comas.',
      'pt': 'Gere uma lista de 5-7 tags/categorias principais que descrevam o conteúdo, separadas por vírgulas.',
      'fr': 'Générez une liste de 5-7 tags/catégories principaux décrivant le contenu, séparés par des virgules.',
      'de': 'Generieren Sie eine Liste von 5-7 Haupttags/-kategorien, die den Inhalt beschreiben, getrennt durch Kommas.',
      'it': 'Genera un elenco di 5-7 tag/categorie principali che descrivono il contenuto, separati da virgole.',
    };

    // Build prompt based on what's requested
    if (generateSummary && generateTags) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = `${summaryPromptSet[language] || summaryPromptSet['es']} Después, añade una sección llamada "Tags:" seguida de ${tagsPrompts[language] || tagsPrompts['es']}`;
    } else if (generateSummary) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = summaryPromptSet[language] || summaryPromptSet['es'];
    } else if (generateTags) {
      prompt = tagsPrompts[language] || tagsPrompts['es'];
    } else {
      console.warn('[LeMUR] Neither summary nor tags requested - returning empty result');
      return { summary: '', tags: [] };
    }

    const result = await client.lemur.task({
      transcript_ids: [transcriptId],
      prompt: prompt,
      final_model: 'anthropic/claude-3-5-haiku-20241022',
    });

    const fullText = result.response;

    // Parse based on what was requested
    let summary = '';
    let tags: string[] = [];

    if (generateSummary && generateTags) {
      // Both requested - parse for tags marker
      const tagsMarker = /\n(Tags|Etiquetas|Etiketak|Categorías):/i;
      const match = fullText.match(tagsMarker);

      if (match && match.index) {
        summary = fullText.slice(0, match.index).trim();
        const tagsString = fullText.slice(match.index + match[0].length).trim();
        tags = tagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      } else {
        // Fallback if tags marker not found
        summary = fullText.trim();
      }
    } else if (generateSummary) {
      // Only summary requested
      summary = fullText.trim();
    } else if (generateTags) {
      // Only tags requested - parse comma-separated list
      tags = fullText.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    console.log('[LeMUR] Generation completed:', {
      summaryLength: summary.length,
      tagsCount: tags.length
    });
    return { summary, tags };

  } catch (error: any) {
    console.error('[LeMUR] Summary generation failed:', error.message);
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
 * Identify speaker names and roles using LeMUR
 */
export async function identifySpeakersWithLeMUR(
  transcriptId: string,
  language: string = 'es'
): Promise<Record<string, { name?: string; role?: string }>> {
  const client = getAssemblyAIClient();

  try {
    console.log('[LeMUR] Identifying speakers for transcript:', transcriptId);

    // Prompts for different languages
    const prompts: Record<string, string> = {
      'es': `Analiza la transcripción e identifica a cada orador (Speaker A, Speaker B, etc.) con su nombre real y cargo/profesión SI SE MENCIONAN en el audio.

Reglas importantes:
- SOLO incluye nombres y cargos que se mencionen EXPLÍCITAMENTE en la conversación
- Si una persona se presenta diciendo "Soy Juan Pérez, director de..." extrae ese nombre y cargo
- Si alguien menciona "el ministro dijo..." o "la doctora explicó..." extrae ese cargo
- Si NO hay información sobre un speaker, NO inventes datos
- Busca patrones como: presentaciones, títulos profesionales, cargos mencionados

Devuelve ÚNICAMENTE un JSON con este formato (sin texto adicional):
{
  "Speaker A": {"name": "Nombre Real", "role": "Cargo/Profesión"},
  "Speaker B": {"role": "Cargo si no hay nombre"},
  "Speaker C": {}
}

Si no hay información de identificación, devuelve un objeto vacío {} para ese speaker.`,

      'en': `Analyze the transcription and identify each speaker (Speaker A, Speaker B, etc.) with their real name and job title/profession IF MENTIONED in the audio.

Important rules:
- ONLY include names and titles that are EXPLICITLY mentioned in the conversation
- If someone introduces themselves saying "I'm John Doe, director of..." extract that name and title
- If someone mentions "the minister said..." or "the doctor explained..." extract that title
- If there's NO information about a speaker, DO NOT make up data
- Look for patterns like: introductions, professional titles, mentioned positions

Return ONLY a JSON with this format (no additional text):
{
  "Speaker A": {"name": "Real Name", "role": "Job Title/Profession"},
  "Speaker B": {"role": "Title if no name available"},
  "Speaker C": {}
}

If there's no identifying information, return an empty object {} for that speaker.`,

      'ca': `Analitza la transcripció i identifica cada orador (Speaker A, Speaker B, etc.) amb el seu nom real i càrrec/professió SI ES MENCIONEN a l'àudio.

Regles importants:
- NOMÉS inclou noms i càrrecs que es mencionin EXPLÍCITAMENT a la conversa
- Si una persona es presenta dient "Sóc Joan Pérez, director de..." extreu aquest nom i càrrec
- Si algú menciona "el ministre va dir..." o "la doctora va explicar..." extreu aquest càrrec
- Si NO hi ha informació sobre un speaker, NO inventis dades
- Busca patrons com: presentacions, títols professionals, càrrecs mencionats

Retorna ÚNICAMENT un JSON amb aquest format (sense text addicional):
{
  "Speaker A": {"name": "Nom Real", "role": "Càrrec/Professió"},
  "Speaker B": {"role": "Càrrec si no hi ha nom"},
  "Speaker C": {}
}

Si no hi ha informació d'identificació, retorna un objecte buit {} per aquest speaker.`,

      'eu': `Aztertu transkripzioa eta identifikatu hizlari bakoitza (Speaker A, Speaker B, etab.) beren izen erreala eta kargua/lanbidearekin AUDIOAN AIPATZEN BADIRA.

Arau garrantzitsuak:
- SOILIK sartu elkarrizketan ESPLIZITUKI aipatzen diren izenak eta karguak
- Norbait aurkezten bada "Ni naiz Juan Perez, zuzendaria..." esanez, atera izen eta kargu hori
- Norbaitek "ministroak esan zuen..." edo "doktoreak azaldu zuen..." aipatzen badu, atera kargu hori
- Speaker bati buruzko informaziorik EZ badago, EZ asmatu daturik
- Bilatu ereduak hala nola: aurkezpenak, lan tituluak, aipatutako karguak

Itzuli SOILIK JSON bat formatu honekin (testu gehigarririk gabe):
{
  "Speaker A": {"name": "Izen Erreala", "role": "Kargua/Lanbidea"},
  "Speaker B": {"role": "Kargua izenik ez badago"},
  "Speaker C": {}
}

Identifikazio informaziorik ez badago, itzuli objektu huts bat {} speaker horrentzat.`,

      'gl': `Analiza a transcrición e identifica a cada orador (Speaker A, Speaker B, etc.) co seu nome real e cargo/profesión SE SE MENCIONAN no audio.

Regras importantes:
- SÓ inclúe nomes e cargos que se mencionen EXPLÍCITAMENTE na conversa
- Se unha persoa se presenta dicindo "Son Xoán Pérez, director de..." extrae ese nome e cargo
- Se alguén menciona "o ministro dixo..." ou "a doutora explicou..." extrae ese cargo
- Se NON hai información sobre un speaker, NON inventes datos
- Busca patróns como: presentacións, títulos profesionais, cargos mencionados

Devolve ÚNICAMENTE un JSON con este formato (sen texto adicional):
{
  "Speaker A": {"name": "Nome Real", "role": "Cargo/Profesión"},
  "Speaker B": {"role": "Cargo se non hai nome"},
  "Speaker C": {}
}

Se non hai información de identificación, devolve un obxecto baleiro {} para ese speaker.`,

      'pt': `Analise a transcrição e identifique cada orador (Speaker A, Speaker B, etc.) com seu nome real e cargo/profissão SE MENCIONADOS no áudio.

Regras importantes:
- APENAS inclua nomes e cargos que sejam EXPLICITAMENTE mencionados na conversa
- Se alguém se apresenta dizendo "Sou João Pereira, diretor de..." extraia esse nome e cargo
- Se alguém menciona "o ministro disse..." ou "a doutora explicou..." extraia esse cargo
- Se NÃO houver informação sobre um speaker, NÃO invente dados
- Procure por padrões como: apresentações, títulos profissionais, cargos mencionados

Retorne APENAS um JSON com este formato (sem texto adicional):
{
  "Speaker A": {"name": "Nome Real", "role": "Cargo/Profissão"},
  "Speaker B": {"role": "Cargo se não houver nome"},
  "Speaker C": {}
}

Se não houver informação de identificação, retorne um objeto vazio {} para esse speaker.`,

      'fr': `Analysez la transcription et identifiez chaque orateur (Speaker A, Speaker B, etc.) avec son nom réel et son poste/profession S'ILS SONT MENTIONNÉS dans l'audio.

Règles importantes:
- N'incluez QUE les noms et postes EXPLICITEMENT mentionnés dans la conversation
- Si quelqu'un se présente en disant "Je suis Jean Dupont, directeur de..." extrayez ce nom et ce poste
- Si quelqu'un mentionne "le ministre a dit..." ou "la docteure a expliqué..." extrayez ce poste
- S'il n'y a PAS d'information sur un speaker, N'inventez PAS de données
- Cherchez des patterns comme: présentations, titres professionnels, postes mentionnés

Retournez UNIQUEMENT un JSON avec ce format (sans texte supplémentaire):
{
  "Speaker A": {"name": "Nom Réel", "role": "Poste/Profession"},
  "Speaker B": {"role": "Poste si pas de nom"},
  "Speaker C": {}
}

S'il n'y a pas d'information d'identification, retournez un objet vide {} pour ce speaker.`,

      'de': `Analysieren Sie die Transkription und identifizieren Sie jeden Sprecher (Speaker A, Speaker B, usw.) mit seinem echten Namen und Beruf/Position FALLS IM AUDIO ERWÄHNT.

Wichtige Regeln:
- Nehmen Sie NUR Namen und Positionen auf, die EXPLIZIT in der Unterhaltung erwähnt werden
- Wenn sich jemand vorstellt mit "Ich bin Hans Müller, Direktor von..." extrahieren Sie diesen Namen und Position
- Wenn jemand erwähnt "der Minister sagte..." oder "die Ärztin erklärte..." extrahieren Sie diese Position
- Wenn es KEINE Informationen über einen Sprecher gibt, erfinden Sie KEINE Daten
- Suchen Sie nach Mustern wie: Vorstellungen, Berufstitel, erwähnte Positionen

Geben Sie NUR ein JSON in diesem Format zurück (ohne zusätzlichen Text):
{
  "Speaker A": {"name": "Echter Name", "role": "Position/Beruf"},
  "Speaker B": {"role": "Position falls kein Name"},
  "Speaker C": {}
}

Falls keine identifizierenden Informationen vorhanden sind, geben Sie ein leeres Objekt {} für diesen Sprecher zurück.`,

      'it': `Analizza la trascrizione e identifica ogni oratore (Speaker A, Speaker B, ecc.) con il suo nome reale e carica/professione SE MENZIONATI nell'audio.

Regole importanti:
- Includi SOLO nomi e cariche ESPLICITAMENTE menzionati nella conversazione
- Se qualcuno si presenta dicendo "Sono Giovanni Rossi, direttore di..." estrai quel nome e carica
- Se qualcuno menziona "il ministro ha detto..." o "la dottoressa ha spiegato..." estrai quella carica
- Se NON ci sono informazioni su un speaker, NON inventare dati
- Cerca pattern come: presentazioni, titoli professionali, cariche menzionate

Restituisci SOLO un JSON con questo formato (senza testo aggiuntivo):
{
  "Speaker A": {"name": "Nome Reale", "role": "Carica/Professione"},
  "Speaker B": {"role": "Carica se non c'è nome"},
  "Speaker C": {}
}

Se non ci sono informazioni identificative, restituisci un oggetto vuoto {} per quello speaker.`,
    };

    const prompt = prompts[language] || prompts['es'];

    const result = await client.lemur.task({
      transcript_ids: [transcriptId],
      prompt: prompt,
      final_model: 'anthropic/claude-3-5-haiku-20241022',
    });

    // Parse JSON response
    try {
      const cleaned = result.response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const speakerIdentities = JSON.parse(cleaned);
      console.log('[LeMUR] Speaker identification successful:', speakerIdentities);
      return speakerIdentities;
    } catch (parseError) {
      console.error('[LeMUR] Failed to parse speaker identification JSON:', parseError);
      return {};
    }

  } catch (error: any) {
    console.error('[LeMUR] Speaker identification failed:', error.message);
    return {}; // Return empty object on failure
  }
}

/**
 * Generate speakers/participants report from transcription
 */
export function generateSpeakersReport(
  result: TranscriptionResult,
  detailed: boolean = false,
  speakerIdentities?: Record<string, { name?: string; role?: string }>
): string {
  if (!result.utterances || result.utterances.length === 0) {
    return 'No se detectaron oradores en esta transcripción.';
  }

  // Extract unique speakers, filtering out undefined/null values
  const speakers = [...new Set(result.utterances.map(u => u.speaker).filter(Boolean))].sort();

  if (speakers.length === 0) {
    return 'No se detectaron oradores en esta transcripción.';
  }

  // Validate audioDuration to avoid division by zero
  if (!result.audioDuration || result.audioDuration <= 0) {
    return 'Error: La duración del audio no es válida para generar el reporte.';
  }

  // Helper function to format speaker name with identity
  const formatSpeakerName = (speaker: string): string => {
    if (!speakerIdentities || !speakerIdentities[speaker]) {
      return speaker;
    }

    const identity = speakerIdentities[speaker];
    const parts: string[] = [speaker];

    if (identity.name) {
      parts.push(identity.name);
    }

    if (identity.role) {
      parts.push(`(${identity.role})`);
    }

    return parts.join(' - ');
  };

  // Calculate statistics for each speaker
  const speakerStats = speakers.map(speaker => {
    const utterances = result.utterances!.filter(u => u.speaker === speaker);

    // Calculate total words, filtering empty text
    const totalWords = utterances.reduce((sum, u) => {
      const text = u.text?.trim() || '';
      if (text.length === 0) return sum;
      return sum + text.split(/\s+/).length;
    }, 0);

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
    // Safe percentage calculation
    const percentage = result.audioDuration > 0
      ? ((stats.totalDuration / result.audioDuration) * 100).toFixed(1)
      : '0.0';

    // Safe average calculation
    const avgDuration = stats.interventions > 0
      ? formatDuration(stats.totalDuration / stats.interventions)
      : '0:00';

    report += `${index + 1}. ${formatSpeakerName(stats.speaker)}\n`;
    report += `   Intervenciones: ${stats.interventions}\n`;
    report += `   Palabras pronunciadas: ${stats.totalWords}\n`;
    report += `   Tiempo total: ${formatDuration(stats.totalDuration)} (${percentage}% del total)\n`;
    report += `   Promedio por intervención: ${avgDuration}\n\n`;
  });

  // Detailed timeline - ONLY if requested
  if (detailed) {
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
  }

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
  filename: string,
  detailed: boolean = false,
  speakerIdentities?: Record<string, { name?: string; role?: string }>
): Promise<string> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  const report = generateSpeakersReport(result, detailed, speakerIdentities);

  const speakersBlob = await put(`${baseName}-oradores.txt`, report, {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    token: blobToken,
    addRandomSuffix: true
  });

  return speakersBlob.url;
}

/**
 * Generate summary and/or tags from raw text using AssemblyAI LeMUR
 * For documents (PDF, TXT, DOCX) that don't have AssemblyAI transcripts
 */
export async function generateSummaryFromTextWithLeMUR(
  text: string,
  language: string = 'es',
  generateSummary: boolean = true,
  generateTags: boolean = true,
  summaryType: 'short' | 'detailed' = 'detailed'
): Promise<SummaryResult> {
  const client = getAssemblyAIClient();

  try {
    console.log('[LeMUR Document] Generating content from text:', {
      textLength: text.length,
      generateSummary,
      generateTags,
      summaryType,
      language
    });

    // Build prompt based on what's requested (same logic as transcript-based summarization)
    let prompt = '';

    const summaryPromptsShort: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 1-2 párrafos breves (máximo 150 palabras). Sé conciso y directo.',
      'en': 'Summarize the following text in English in 1-2 brief paragraphs (maximum 150 words). Be concise and direct.',
      'ca': 'Resumeix el següent text en català en 1-2 paràgrafs breus (màxim 150 paraules). Sigues concís i directe.',
      'eu': 'Laburtu ondorengo testua euskaraz 1-2 paragrafo laburren (gehienez 150 hitz). Izan zehatza eta zuzena.',
      'gl': 'Resume o seguinte texto en galego en 1-2 parágrafos breves (máximo 150 palabras). Sé conciso e directo.',
      'pt': 'Resume o seguinte texto em português em 1-2 parágrafos breves (máximo 150 palavras). Seja conciso e direto.',
    };

    const summaryPromptsDetailed: Record<string, string> = {
      'es': 'Resume el siguiente texto en español en 3-4 párrafos detallados. Incluye los puntos clave y contexto relevante.',
      'en': 'Summarize the following text in English in 3-4 detailed paragraphs. Include key points and relevant context.',
      'ca': 'Resumeix el següent text en català en 3-4 paràgrafs detallats. Inclou els punts clau i context rellevant.',
      'eu': 'Laburtu ondorengo testua euskaraz 3-4 paragrafo xehakatutan. Sartu puntu nagusiak eta testuinguru garrantzitsua.',
      'gl': 'Resume o seguinte texto en galego en 3-4 parágrafos detallados. Inclúe os puntos clave e contexto relevante.',
      'pt': 'Resume o seguinte texto em português em 3-4 parágrafos detalhados. Inclua os pontos-chave e contexto relevante.',
    };

    const tagsPrompts: Record<string, string> = {
      'es': 'Genera una lista de 5-7 tags/categorías principales que describan el contenido, separadas por comas.',
      'en': 'Generate a list of 5-7 main tags/categories that describe the content, separated by commas.',
      'ca': 'Genera una llista de 5-7 etiquetes/categories principals que descriguin el contingut, separades per comes.',
      'eu': 'Sortu edukia deskribatzen duten 5-7 etiketa/kategoria nagusien zerrenda bat, komaz bereizita.',
      'gl': 'Xera unha lista de 5-7 etiquetas/categorías principais que describan o contido, separadas por comas.',
      'pt': 'Gere uma lista de 5-7 tags/categorias principais que descrevam o conteúdo, separadas por vírgulas.',
    };

    if (generateSummary && generateTags) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = `${summaryPromptSet[language] || summaryPromptSet['es']} Después, añade una sección llamada "Tags:" seguida de ${tagsPrompts[language] || tagsPrompts['es']}`;
    } else if (generateSummary) {
      const summaryPromptSet = summaryType === 'short' ? summaryPromptsShort : summaryPromptsDetailed;
      prompt = summaryPromptSet[language] || summaryPromptSet['es'];
    } else if (generateTags) {
      prompt = tagsPrompts[language] || tagsPrompts['es'];
    } else {
      console.warn('[LeMUR Document] Neither summary nor tags requested - returning empty result');
      return { summary: '', tags: [] };
    }

    // Use LeMUR with custom text input (no transcript_ids needed for documents)
    const result = await client.lemur.task({
      input_text: text.substring(0, 100000), // Limit to ~100k characters for safety
      prompt: prompt,
      final_model: 'anthropic/claude-3-5-haiku-20241022',
    });

    const fullText = result.response;

    // Parse results (same logic as transcript-based summarization)
    let summary = '';
    let tags: string[] = [];

    if (generateSummary && generateTags) {
      const tagsMarker = /\n(Tags|Etiquetas|Etiketak|Categorías):/i;
      const match = fullText.match(tagsMarker);

      if (match && match.index) {
        summary = fullText.slice(0, match.index).trim();
        const tagsString = fullText.slice(match.index + match[0].length).trim();
        tags = tagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      } else {
        summary = fullText.trim();
      }
    } else if (generateSummary) {
      summary = fullText.trim();
    } else if (generateTags) {
      tags = fullText.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    console.log('[LeMUR Document] Generation completed:', {
      summaryLength: summary.length,
      tagsCount: tags.length
    });

    return { summary, tags };

  } catch (error: any) {
    console.error('[LeMUR Document] Error generating summary from text:', error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}
