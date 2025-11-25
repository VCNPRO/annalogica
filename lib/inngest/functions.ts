// DÓNDE: lib/inngest/functions.ts
// VERSIÓN CORREGIDA: Se ha eliminado la importación del tipo 'Utterance' que causaba el error.

import { inngest } from './client';
import { TranscriptionJobDB } from '@/lib/db';
import { logTranscription, logSummary } from '@/lib/usage-tracking';
import { put, del } from '@vercel/blob';

// --- 1. IMPORTACIÓN CORREGIDA ---
// Se ha quitado 'Utterance' de esta línea.
import { createClient } from "@deepgram/sdk";
import OpenAI from "openai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// --- HELPERS (Funciones de ayuda) ---
// La función 'generateSrt' y 'generateVtt' ahora aceptan 'any[]' para evitar el error.
const saveTextToFile = async (text: string, baseFilename: string, extension: string) => {
    const timestamp = Date.now();
    const filename = `${timestamp}-${baseFilename.replace(/\.[^/.]+$/, '')}-annalogica.${extension}`;
    const blob = await put(filename, text, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      addRandomSuffix: true
    });
    return blob.url;
};

const formatTimestamp = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
};

const generateSrt = (utterances: any[]) => {
    return utterances.map((utt, i) =>
        `${i + 1}\n${formatTimestamp(utt.start)} --> ${formatTimestamp(utt.end)}\nHablante ${utt.speaker}: ${utt.transcript}`
    ).join('\n\n');
};

const generateVtt = (utterances: any[]) => {
    const header = "WEBVTT\n\n";
    return header + utterances.map((utt) =>
        `${formatTimestamp(utt.start).replace(',', '.')} --> ${formatTimestamp(utt.end).replace(',', '.')}\n<v Hablante ${utt.speaker}>${utt.transcript}</v>`
    ).join('\n\n');
};


/**
 * [Task] Transcribe File (MIGRADO A DEEPGRAM + FUNCIONALIDAD CRÍTICA)
 */
export const transcribeFile = inngest.createFunction(
  {
    id: 'task-transcribe-file-deepgram-v2',
    name: 'Task: Transcribe File (Deepgram)',
    retries: 2,
    concurrency: { limit: 5 }
  },
  { event: 'task/transcribe' },
  async ({ event, step }) => {
    const { jobId } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job) { return { error: 'Job not found' }; }
    const { user_id: userId, audio_url: audioUrl, filename, metadata: jobMetadata } = job;
    const actions = jobMetadata?.actions || [];

    await step.run('update-status-processing', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
    });

    const deepgramResult = await step.run('transcribe-audio-deepgram', async () => {
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
          { url: audioUrl },
          { model: "nova-3", smart_format: true, diarize: true, utterances: true }
      );
      if (error) throw new Error(error.message);
      return result;
    });

    const transcript = deepgramResult.results.channels[0].alternatives[0].transcript;
    // --- LÍNEA CORREGIDA ---
    // Hemos quitado ': Utterance[]' y dejamos que TypeScript infiera el tipo.
    const utterances = deepgramResult.results.utterances || [];
    const audioDuration = deepgramResult.metadata.duration;

    let speakerIdentities: Record<string, { name?: string; role?: string }> = {};
    if (actions.includes('Oradores')) {
        speakerIdentities = await step.run('identify-speakers-openai', async () => {
            const prompt = `Analiza la siguiente transcripción e identifica el nombre y/o cargo de cada hablante (ej: "Hablante 0", "Hablante 1"). Si un hablante dice su nombre o cargo, extráelo. Responde ÚNICAMENTE en formato JSON con la estructura: {"0": {"name": "Nombre Inferido", "role": "Cargo Inferido"}, "1": {"name": "...", "role": "..."}}. Si no puedes identificar a alguien, deja su nombre o cargo como un string vacío. Texto: \n---\n${transcript}`;
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                });
                return JSON.parse(completion.choices[0].message.content || '{}');
            } catch (e) {
                console.error("Fallo al identificar oradores con OpenAI, se usarán valores por defecto.", e);
                return {}; // Devuelve un objeto vacío en caso de error
            }
        });
    }

    let srtUrl: string | undefined, vttUrl: string | undefined;
    if (actions.includes('Subtítulos')) {
        const urls = await step.run('generate-subtitles', async () => {
            const srtContent = generateSrt(utterances);
            const vttContent = generateVtt(utterances);
            const srt = await saveTextToFile(srtContent, filename, 'srt');
            const vtt = await saveTextToFile(vttContent, filename, 'vtt');
            return { srt, vtt };
        });
        srtUrl = urls.srt;
        vttUrl = urls.vtt;
    }

    const txtUrl = await step.run('save-transcript-txt', async () => {
        return await saveTextToFile(transcript, filename, 'txt');
    });

    await step.run('update-db-with-results', async () => {
        const speakers = [...new Set(utterances.map(u => `Hablante ${u.speaker}`))].sort();
        const metadata: any = { ...jobMetadata, speakers, speakerIdentities };
        
        const updateData: any = {
            assemblyaiId: deepgramResult.metadata.request_id,
            txtUrl,
            audioDuration,
            metadata,
            srtUrl,
            vttUrl,
        };
        await TranscriptionJobDB.updateResults(jobId, updateData);
        await logTranscription(userId, filename, audioDuration);
    });
    
    await step.run('delete-original-audio', async () => {
        try { await del(audioUrl); } catch (e: any) { console.error(`Fallo al borrar audio (no-fatal):`, e.message); }
    });

    await step.run('update-status-transcribed', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'transcribed');
    });

    const needsSummary = actions.includes('Resumir') || actions.includes('Etiquetas');
    if (needsSummary) {
        await step.sendEvent('trigger-summarization', { name: 'task/summarize', data: { jobId, actions } });
    } else {
        await step.run('mark-completed-no-summary', async () => {
            await TranscriptionJobDB.updateStatus(jobId, 'completed');
        });
    }
    return { status: 'transcribed' };
  }
);


/**
 * [Task] Summarize File (MIGRADO A OPENAI)
 */
export const summarizeFile = inngest.createFunction(
  {
    id: 'task-summarize-file-openai',
    name: 'Task: Summarize File (OpenAI)',
    retries: 3,
  },
  { event: 'task/summarize' },
  async ({ event, step }) => {
    // (Esta función no necesita cambios, ya que depende del texto transcrito)
    // El resto de tu código de summarizeFile se mantiene igual
    const { jobId, actions: requestedActions } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || !job.txt_url) {
      return { error: 'Job not found or not transcribed' };
    }

    const { user_id: userId, filename, metadata } = job;
    const actions = requestedActions || metadata?.actions || [];
    const generateSummary = actions.includes('Resumir');
    const generateTags = actions.includes('Etiquetas');
    const summaryType = metadata?.summaryType || 'detailed';

    const { summary, tags } = await step.run('generate-summary-with-openai', async () => {
      const textResponse = await fetch(job.txt_url!);
      const transcriptText = await textResponse.text();

      const prompt = `
        Analiza la siguiente transcripción.
        ${generateSummary ? `Genera un resumen de tipo "${summaryType}".` : ''}
        ${generateTags ? 'Genera una lista de 5 a 10 etiquetas clave (tags) relevantes.' : ''}
        Responde en formato JSON con las claves "summary" y "tags". Si no se pide un resumen, la clave "summary" debe ser un string vacío. Si no se piden etiquetas, "tags" debe ser un array vacío.
        El texto es:
        ---
        ${transcriptText}
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return {
          summary: result.summary || '',
          tags: result.tags || [],
      };
    });

    let summaryUrl: string | undefined = undefined;
    if (generateSummary && summary) {
      summaryUrl = await step.run('save-summary', async () => {
        return await saveTextToFile(summary, filename, 'summary.txt');
      });
    }

    await step.run('update-db-with-summary', async () => {
      const newMetadata = { ...metadata };
      if (generateTags && tags && tags.length > 0) {
        newMetadata.tags = tags;
      }
      const updateData: any = { metadata: newMetadata };
      if (summaryUrl) {
        updateData.summaryUrl = summaryUrl;
      }
      await TranscriptionJobDB.updateResults(jobId, updateData);
      
      const textResponse = await fetch(job.txt_url!);
      const transcriptText = await textResponse.text();
      const tokensInput = Math.ceil(transcriptText.length / 4);
      const tokensOutput = Math.ceil(summary.length / 4);
      await logSummary(userId, tokensInput, tokensOutput);
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    return { status: 'completed' };
  }
);


// --- FUNCIONES DE DOCUMENTOS (INTACTAS) ---
// Estas funciones se mantienen sin cambios.

export const processDocument = inngest.createFunction(
  {
    id: 'task-process-document-openai',
    name: 'Task: Process Document (OpenAI)',
    retries: 2,
    concurrency: { limit: 5 }
  },
  { event: 'task/process-document' },
  async ({ event, step }) => {
    const { jobId, documentUrl, filename, actions, language, summaryType } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job) { return { error: 'Job not found' }; }
    const { user_id: userId, metadata } = job;

    const { extractedText, parseMetadata } = await step.run('extract-text', async () => {
      const { parseDocumentFromURL } = await import('@/lib/document-parser');
      const parseResult = await parseDocumentFromURL(documentUrl, filename);
      return { extractedText: parseResult.text, parseMetadata: parseResult.metadata };
    });

    const txtUrl = await step.run('save-extracted-text', async () => {
        const blob = await put(`${Date.now()}-${filename}-extracted.txt`, extractedText, { access: 'public', contentType: 'text/plain; charset=utf-8', token: process.env.BLOB_READ_WRITE_TOKEN!, addRandomSuffix: true });
        return blob.url;
    });

    await step.run('update-job-with-text', async () => {
      await TranscriptionJobDB.updateResults(jobId, {
        txtUrl,
        metadata: { ...metadata, parseMethod: parseMetadata.method, parseTime: parseMetadata.processingTime, pages: parseMetadata.pages, originalFileSize: parseMetadata.fileSize, warnings: parseMetadata.warnings, actions, summaryType, isDocument: true }
      });
      await TranscriptionJobDB.updateStatus(jobId, 'transcribed');
    });

    const generateSummary = actions.includes('Resumir');
    const generateTags = actions.includes('Etiquetas');
    let summaryUrl: string | undefined, tags: string[] | undefined;

    if (generateSummary || generateTags) {
      const result = await step.run('generate-doc-summary-openai', async () => {
        const prompt = `Analiza el siguiente texto de un documento. ${generateSummary ? `Genera un resumen de tipo "${summaryType}".` : ''} ${generateTags ? 'Genera una lista de 5 a 10 etiquetas clave (tags) relevantes.' : ''} Responde en formato JSON con las claves "summary" y "tags".`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }, {role: "system", content: `El texto es:\n---\n${extractedText}`}],
            response_format: { type: "json_object" },
        });
        const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
        const summary = aiResult.summary || '';
        const blobUrl = (generateSummary && summary) ? await saveTextToFile(summary, filename, 'summary.txt') : undefined;
        return { summaryUrl: blobUrl, tags: aiResult.tags || [] };
      });
      summaryUrl = result.summaryUrl;
      tags = result.tags;
    }

    await step.run('update-job-final', async () => {
      const updateData: any = { metadata: { ...metadata, tags }, summaryUrl };
      await TranscriptionJobDB.updateResults(jobId, updateData);
      if (generateSummary || generateTags) {
        await logSummary(userId, Math.ceil(extractedText.length / 4), Math.ceil((summaryUrl?.length || 0) / 4));
      }
    });

    await step.run('mark-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });
    
    await step.run('cleanup-original-file', async () => {
        try { await del(documentUrl, { token: process.env.BLOB_READ_WRITE_TOKEN! }); } catch (e: any) { console.warn(`Fallo al borrar doc (no-crítico):`, e.message); }
    });

    return { status: 'completed', jobId };
  }
);


/**
 * [Task] Summarize Document (LEGACY - AHORA USA OPENAI)
 */
export const summarizeDocument = inngest.createFunction(
  {
    id: 'task-summarize-document-openai',
    name: 'Task: Summarize Document (Legacy, OpenAI)',
    retries: 3,
  },
  { event: 'task/summarize-document' },
  async ({ event, step }) => {
    const { jobId, actions, text, language, summaryType } = event.data;
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job) { return { error: 'Job not found' }; }
    const { user_id: userId, filename, metadata } = job;

    const generateSummary = actions.includes('Resumir');
    const generateTags = actions.includes('Etiquetas');

    const { summary, tags } = await step.run('generate-legacy-doc-summary-openai', async () => {
        const prompt = `Analiza el siguiente texto de un documento. ${generateSummary ? `Genera un resumen de tipo "${summaryType}".` : ''} ${generateTags ? 'Genera una lista de 5 a 10 etiquetas clave (tags) relevantes.' : ''} Responde en formato JSON con las claves "summary" y "tags".`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }, {role: "system", content: `El texto es:\n---\n${text}`}],
            response_format: { type: "json_object" },
        });
        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return { summary: result.summary || '', tags: result.tags || [] };
    });
    
    let summaryUrl: string | undefined = undefined;
    if (generateSummary && summary) {
        summaryUrl = await step.run('save-summary', async () => await saveTextToFile(summary, filename, 'summary.txt'));
    }

    await step.run('update-db-with-results', async () => {
      const updateData: any = { metadata: { ...metadata, tags }, summaryUrl };
      await TranscriptionJobDB.updateResults(jobId, updateData);
      await logSummary(userId, Math.ceil(text.length / 4), Math.ceil((summary?.length || 0) / 4));
    });

    await step.run('update-status-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    return { status: 'completed' };
  }
);

