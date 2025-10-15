  1 import { AssemblyAI } from 'assemblyai';
     2 import { put, del } from '@vercel/blob';
     3
     4 // Initialize AssemblyAI client
     5 export function getAssemblyAIClient() {
     6   const apiKey = process.env.ASSEMBLYAI_API_KEY;
     7   if (!apiKey) {
     8     throw new Error('ASSEMBLYAI_API_KEY environment variable is not set');
     9   }
    10   return new AssemblyAI({ apiKey });
    11 }
    12
    13 export interface TranscriptionOptions {
    14   audioUrl: string;
    15   language?: 'es' | 'en' | 'ca' | 'eu' | 'gl' | 'pt' | 'auto';
    16   speakerLabels?: boolean;
    17   dualChannel?: boolean;
    18 }
    19
    20 export interface TranscriptionResult {
    21   id: string;
    22   text: string;
    23   words: Array<{
    24     text: string;
    25     start: number;
    26     end: number;
    27     confidence: number;
    28     speaker?: string;
    29   }>;
    30   utterances?: Array<{
    31     text: string;
    32     start: number;
    33     end: number;
    34     confidence: number;
    35     speaker: string;
    36   }>;
    37   audioDuration: number;
    38 }
    39
    40 /**
    41  * Transcribe audio using AssemblyAI
    42  * Uses polling to wait for completion (async-friendly)
    43  */
    44 export async function transcribeAudio(
    45   options: TranscriptionOptions
    46 ): Promise<TranscriptionResult> {
    47   const client = getAssemblyAIClient();
    48
    49   console.log('[AssemblyAI] Starting transcription for:', options.audioUrl);
    50
    51   // Submit transcription job
    52   const transcript = await client.transcripts.transcribe({
    53     audio_url: options.audioUrl,
    54     language_code: ['es', 'en', 'ca', 'eu', 'gl', 'pt'].includes(options.language || '') ? options.language as ('es' | 'en' | 'ca' | 'eu' | 'gl' | 'pt') : undefined,
    55     language_detection: options.language === 'auto',
    56     speaker_labels: options.speakerLabels ?? true, // Enable by default
    57     dual_channel: options.dualChannel ?? false,
    58
    59     // 🔽 Funciones avanzadas de AssemblyAI
    60     summarization: true,
    61     summary_type: 'bullets', // o 'paragraph'
    62     iab_categories: true,
    63     auto_chapters: true,
    64
    65     // Enable key phrases only for English (not available in Spanish)
    66     auto_highlights: options.language === 'en' || options.language === 'auto'
    67   });
    68
    69   console.log('[AssemblyAI] Transcription completed:', transcript.id);
    70   console.log('[AssemblyAI] Status:', transcript.status);
    71
    72   // Check for errors
    73   if (transcript.status === 'error') {
    74     throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    75   }
    76
    77   if (!transcript.text) {
    78     throw new Error('AssemblyAI returned empty transcription');
    79   }
    80
    81   // Return structured result
    82   return {
    83     id: transcript.id,
    84     text: transcript.text,
    85     words: transcript.words?.map(w => ({
    86       text: w.text,
    87       start: w.start,
    88       end: w.end,
    89       confidence: w.confidence,
    90       speaker: w.speaker || undefined
    91     })) || [],
    92     utterances: transcript.utterances?.map(u => ({
    93       text: u.text,
    94       start: u.start,
    95       end: u.end,
    96       confidence: u.confidence,
    97       speaker: u.speaker
    98     })),
    99     audioDuration: transcript.audio_duration || 0
   100   };
   101 }
   102
   103 /**
   104  * Generate SRT subtitle file from transcript
   105  */
   106 export function generateSRT(result: TranscriptionResult): string {
   107   if (!result.utterances || result.utterances.length === 0) {
   108     // Fallback: Use words if no speaker diarization
   109     if (result.words.length === 0) {
   110       return '';
   111     }
   112
   113     let srt = '';
   114     const wordsPerSubtitle = 10;
   115     for (let i = 0; i < result.words.length; i += wordsPerSubtitle) {
   116       const chunk = result.words.slice(i, i + wordsPerSubtitle);
   117       const start = chunk[0].start;
   118       const end = chunk[chunk.length - 1].end;
   119       const text = chunk.map(w => w.text).join(' ');
   120
   121       srt += `${Math.floor(i / wordsPerSubtitle) + 1}\n`;
   122       srt += `${formatTimestamp(start)} --> ${formatTimestamp(end)}\n`;
   123       srt += `${text}\n\n`;
   124     }
   125     return srt;
   126   }
   127
   128   // Use utterances (speaker-aware)
   129   let srt = '';
   130   result.utterances.forEach((utterance, index) => {
   131     srt += `${index + 1}\n`;
   132     srt += `${formatTimestamp(utterance.start)} --> ${formatTimestamp(utterance.end)}\n`;
   133
   134     // Include speaker label
   135     const speaker = utterance.speaker || 'Speaker';
   136     srt += `[${speaker}] ${utterance.text.trim()}\n\n`;
   137   });
   138
   139   return srt;
   140 }
   141
   142 /**
   143  * Generate VTT subtitle file from transcript
   144  */
   145 export function generateVTT(result: TranscriptionResult): string {
   146   const srt = generateSRT(result);
   147   if (!srt) {
   148     return 'WEBVTT\n\n';
   149   }
   150
   151   // Convert SRT to VTT (replace commas with periods in timestamps)
   152   const vtt = 'WEBVTT\n\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
   153   return vtt;
   154 }
   155
   156 /**
   157  * Format timestamp for SRT (HH:MM:SS,mmm)
   158  */
   159 function formatTimestamp(milliseconds: number): string {
   160   const totalSeconds = Math.floor(milliseconds / 1000);
   161   const hours = Math.floor(totalSeconds / 3600);
   162   const minutes = Math.floor((totalSeconds % 3600) / 60);
   163   const seconds = totalSeconds % 60;
   164   const ms = milliseconds % 1000;
   165
   166   return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
   167 }
   168
   169 function pad(num: number, size = 2): string {
   170   return String(num).padStart(size, '0');
   171 }
   172
   173 /**
   174  * Save transcription results to Vercel Blob
   175  */
   176 export async function saveTranscriptionResults(
   177   result: TranscriptionResult,
   178   filename: string,
   179   originalFileUrl: string // Add this parameter
   180 ): Promise<{
   181   txtUrl: string;
   182   srtUrl: string;
   183   vttUrl: string;
   184 }> {
   185   const baseName = filename.replace(/\.[^/.]+$/, '');
   186   const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
   187
   188   if (!blobToken) {
   189     throw new Error('BLOB_READ_WRITE_TOKEN not configured');
   190   }
   191
   192   // Save TXT
   193   const txtBlob = await put(`${baseName}.txt`, result.text, {
   194     access: 'public',
   195     contentType: 'text/plain; charset=utf-8',
   196     token: blobToken,
   197     addRandomSuffix: true
   198   });
   199
   200   // Save SRT
   201   const srtContent = generateSRT(result);
   202   const srtBlob = await put(`${baseName}.srt`, srtContent, {
   203     access: 'public',
   204     contentType: 'text/plain; charset=utf-8',
   205     token: blobToken,
   206     addRandomSuffix: true
   207   });
   208
   209   // Save VTT
   210   const vttContent = generateVTT(result);
   211   const vttBlob = await put(`${baseName}.vtt`, vttContent, {
   212     access: 'public',
   213     contentType: 'text/vtt; charset=utf-8',
   214     token: blobToken,
   215     addRandomSuffix: true
   216   });
   217
   218   // Delete original file after successful processing
   219   try {
   220     await del(originalFileUrl, { token: blobToken });
   221     console.log(`[Vercel Blob] Deleted original file: ${originalFileUrl}`);
   222   } catch (deleteError: any) {
   223     console.error(`[Vercel Blob] Failed to delete original file ${originalFileUrl}:`, deleteError.message);
   224   }
   225
   226   return {
   227     txtUrl: txtBlob.url,
   228     srtUrl: srtBlob.url,
   229     vttUrl: vttBlob.url
   230   };
   231 }
   232
   233 /**
   234  * Generate speakers/participants report from transcription
   235  */
   236 export function generateSpeakersReport(result: TranscriptionResult, detailed: boolean = false): string {
   237   if (!result.utterances || result.utterances.length === 0) {
   238     return 'No se detectaron oradores en esta transcripción.';
   239   }
   240
   241   // Extract unique speakers, filtering out undefined/null values
   242   const speakers = [...new Set(result.utterances.map(u => u.speaker).filter(Boolean))].sort();
   243
   244   if (speakers.length === 0) {
   245     return 'No se detectaron oradores en esta transcripción.';
   246   }
   247
   248   // Validate audioDuration to avoid division by zero
   249   if (!result.audioDuration || result.audioDuration <= 0) {
   250     return 'Error: La duración del audio no es válida para generar el reporte.';
   251   }
   252
   253   // Calculate statistics for each speaker
   254   const speakerStats = speakers.map(speaker => {
   255     const utterances = result.utterances!.filter(u => u.speaker === speaker);
   256
   257     // Calculate total words, filtering empty text
   258     const totalWords = utterances.reduce((sum, u) => {
   259       const text = u.text?.trim() || '';
   260       if (text.length === 0) return sum;
   261       return sum + text.split(/\s+/).length;
   262     }, 0);
   263
   264     const totalDuration = utterances.reduce((sum, u) => sum + (u.end - u.start), 0);
   265     const interventions = utterances.length;
   266
   267     return {
   268       speaker,
   269       interventions,
   270       totalWords,
   271       totalDuration,
   272       utterances
   273     };
   274   });
   275
   276   // Sort by total duration (most active speaker first)
   277   speakerStats.sort((a, b) => b.totalDuration - a.totalDuration);
   278
   279   // Generate report
   280   let report = '='.repeat(60) + '\n';
   281   report += 'ANÁLISIS DE ORADORES / INTERVINIENTES\n';
   282   report += '='.repeat(60) + '\n\n';
   283
   284   report += `Total de oradores detectados: ${speakers.length}\n`;
   285   report += `Duración total del audio: ${formatDuration(result.audioDuration)}\n\n`;
   286
   287   report += '-'.repeat(60) + '\n';
   288   report += 'RESUMEN POR ORADOR\n';
   289   report += '-'.repeat(60) + '\n\n';
   290
   291   speakerStats.forEach((stats, index) => {
   292     // Safe percentage calculation
   293     const percentage = result.audioDuration > 0
   294       ? ((stats.totalDuration / result.audioDuration) * 100).toFixed(1)
   295       : '0.0';
   296
   297     // Safe average calculation
   298     const avgDuration = stats.interventions > 0
   299       ? formatDuration(stats.totalDuration / stats.interventions)
   300       : '0:00';
   301
   302     report += `${index + 1}. ${stats.speaker}\n`;
   303     report += `   Intervenciones: ${stats.interventions}\n`;
   304     report += `   Palabras pronunciadas: ${stats.totalWords}\n`;
   305     report += `   Tiempo total: ${formatDuration(stats.totalDuration)} (${percentage}% del total)\n`;
   306     report += `   Promedio por intervención: ${avgDuration}\n\n`;
   307   });
   308
   309   // Detailed timeline - ONLY if requested
   310   if (detailed) {
   311     report += '-'.repeat(60) + '\n';
   312     report += 'LÍNEA DE TIEMPO DETALLADA\n';
   313     report += '-'.repeat(60) + '\n\n';
   314
   315     result.utterances.forEach((utterance, index) => {
   316       const startTime = formatTimestampSimple(utterance.start);
   317       const endTime = formatTimestampSimple(utterance.end);
   318       const duration = formatDuration(utterance.end - utterance.start);
   319
   320       report += `[${startTime} → ${endTime}] (${duration})\n`;
   321       report += `${utterance.speaker}: ${utterance.text.trim()}\n\n`;
   322     });
   323   }
   324
   325   return report;
   326 }
   327
   328 /**
   329  * Format milliseconds to readable duration (MM:SS)
   330  */
   331 function formatDuration(ms: number): string {
   332   const totalSeconds = Math.floor(ms / 1000);
   333   const minutes = Math.floor(totalSeconds / 60);
   334   const seconds = totalSeconds % 60;
   335   return `${minutes}:${pad(seconds)}`;
   336 }
   337
   338 /**
   339  * Format timestamp for simple display (HH:MM:SS)
   340  */
   341 function formatTimestampSimple(ms: number): string {
   342   const totalSeconds = Math.floor(ms / 1000);
   343   const hours = Math.floor(totalSeconds / 3600);
   344   const minutes = Math.floor((totalSeconds % 3600) / 60);
   345   const seconds = totalSeconds % 60;
   346
   347   if (hours > 0) {
   348     return `${hours}:${pad(minutes)}:${pad(seconds)}`;
   349   }
   350   return `${minutes}:${pad(seconds)}`;
   351 }
   352
   353 /**
   354  * Save speakers report to Vercel Blob
   355  */
   356 export async function saveSpeakersReport(
   357   result: TranscriptionResult,
   358   filename: string,
   359   detailed: boolean = false
   360 ): Promise<string> {
   361   const baseName = filename.replace(/\.[^/.]+$/, '');
   362   const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
   363
   364   if (!blobToken) {
   365     throw new Error('BLOB_READ_WRITE_TOKEN not configured');
   366   }
   367
   368   const report = generateSpeakersReport(result, detailed);
   369
   370   const speakersBlob = await put(`${baseName}-oradores.txt`, report, {
   371     access: 'public',
   372     contentType: 'text/plain; charset=utf-8',
   373     token: blobToken,
   374     addRandomSuffix: true
   375   });
   376
   377   return speakersBlob.url;
   378 }
