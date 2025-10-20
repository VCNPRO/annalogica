// DÓNDE: lib/inngest/functions.ts
// VERSIÓN 100% COMPLETA Y FINAL: Todas las funciones con su código completo, migradas y con diagnóstico.

import { inngest } from './client';
import { TranscriptionJobDB } from '@/lib/db';
import { logTranscription, logSummary } from '@/lib/usage-tracking';
import { put, del } from '@vercel/blob';
import { createClient } from "@deepgram/sdk";
import OpenAI from "openai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// --- HELPERS ---
const saveTextToFile = async (text: string, baseFilename: string, extension: string) => {
    const timestamp = Date.now();
    const filename = `${timestamp}-${baseFilename.replace(/\.[^/.]+$/, '')}-annalogica.${extension}`;
    const blob = await put(filename, text, { access: 'public', contentType: 'text/plain; charset=utf-8', token: process.env.BLOB_READ_WRITE_TOKEN!, addRandomSuffix: true });
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
    return utterances.map((utt, i) => `${i + 1}\n${formatTimestamp(utt.start)} --> ${formatTimestamp(utt.end)}\nHablante ${utt.speaker}: ${utt.transcript}`).join('\n\n');
};
const generateVtt = (utterances: any[]) => {
    return `WEBVTT\n\n` + utterances.map((utt) => `${formatTimestamp(utt.start).replace(',', '.')} --> ${formatTimestamp(utt.end).replace(',', '.')}\n<v Hablante ${utt.speaker}>${utt.transcript}</v>`).join('\n\n');
};


// --- FUNCIONES DE AUDIO CON DIAGNÓSTICO ---
export const transcribeFile = inngest.createFunction(
  { id: 'task-transcribe-file-deepgram-v3', name: 'Task: Transcribe File (Deepgram)', retries: 2, concurrency: { limit: 10 } },
  { event: 'task/transcribe' },
  async ({ event, step }) => {
    const { jobId } = event.data;
    try {
        const job = await TranscriptionJobDB.findById(jobId);
        if (!job) { throw new Error('Job not found in DB'); }
        const { user_id: userId, audio_url: audioUrl, filename, metadata: jobMetadata } = job;
        const actions = jobMetadata?.actions || [];
        
        await step.run('update-status-processing', async () => await TranscriptionJobDB.updateStatus(jobId, 'processing'));

        const deepgramResult = await step.run('transcribe-audio-deepgram', async () => {
          const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
              { url: audioUrl },
              { model: "nova-3", smart_format: true, diarize: true, utterances: true }
          );
          if (error) throw new Error(error.message);
          return result;
        });
        const transcript = deepgramResult.results.channels[0].alternatives[0].transcript;
        const utterances = deepgramResult.results.utterances || [];
        const audioDuration = deepgramResult.metadata.duration;
        
        let speakerIdentities = {};
        if (actions.includes('Oradores')) {
            speakerIdentities = await step.run('identify-speakers-openai', async () => {
                const prompt = `Analiza la siguiente transcripción e identifica el nombre y/o cargo de cada hablante (ej: "Hablante 0", "Hablante 1"). Responde ÚNICAMENTE en formato JSON. Texto: \n---\n${transcript}`;
                try {
                    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } });
                    return JSON.parse(completion.choices[0].message.content || '{}');
                } catch (e) { console.error("Fallo al identificar oradores con OpenAI", e); return {}; }
            });
        }

        let srtUrl: string | undefined, vttUrl: string | undefined;
        if (actions.includes('Subtítulos')) {
            const urls = await step.run('generate-subtitles', async () => {
                const srt = await saveTextToFile(generateSrt(utterances), filename, 'srt');
                const vtt = await saveTextToFile(generateVtt(utterances), filename, 'vtt');
                return { srt, vtt };
            });
            srtUrl = urls.srt; vttUrl = urls.vtt;
        }

        const txtUrl = await step.run('save-transcript-txt', async () => await saveTextToFile(transcript, filename, 'txt'));

        await step.run('update-db-with-results', async () => {
            const speakers = [...new Set(utterances.map(u => `Hablante ${u.speaker}`))].sort();
            const metadata = { ...jobMetadata, speakers, speakerIdentities };
            await TranscriptionJobDB.updateResults(jobId, { assemblyaiId: deepgramResult.metadata.request_id, txtUrl, audioDuration, metadata, srtUrl, vttUrl });
            await logTranscription(userId, filename, audioDuration);
        });
        
        await step.run('delete-original-audio', async () => {
            try { await del(audioUrl); } catch (e: any) { console.error(`Fallo al borrar audio (no-fatal):`, e.message); }
        });

        await step.run('update-status-transcribed', async () => await TranscriptionJobDB.updateStatus(jobId, 'transcribed'));
        
        if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
            await step.sendEvent('trigger-summarization', { name: 'task/summarize', data: { jobId, actions } });
        } else {
            await step.run('mark-completed-no-summary', async () => await TranscriptionJobDB.updateStatus(jobId, 'completed'));
        }
        return { status: 'transcribed' };
    } catch (error: any) {
        console.error(`[CRITICAL] Job ${jobId} failed in transcribeFile:`, error);
        await step.run('mark-job-as-failed', async () => {
          await TranscriptionJobDB.updateResults(jobId, { status: 'FAILED', error_message: error.message });
        });
        throw error;
    }
  }
);

export const summarizeFile = inngest.createFunction(
  { id: 'task-summarize-file-openai-v2', name: 'Task: Summarize File (OpenAI)', retries: 3, concurrency: { limit: 10 } },
  { event: 'task/summarize' },
  async ({ event, step }) => {
      const { jobId } = event.data;
      try {
        const job = await TranscriptionJobDB.findById(jobId);
        if (!job || !job.txt_url) { throw new Error('Job not found or not transcribed'); }
        const { user_id: userId, filename, metadata } = job;
        const actions = event.data.actions || metadata?.actions || [];
        const generateSummary = actions.includes('Resumir');
        const generateTags = actions.includes('Etiquetas');
        const summaryType = metadata?.summaryType || 'detailed';

        const { summary, tags } = await step.run('generate-summary-with-openai', async () => {
          const textResponse = await fetch(job.txt_url!);
          const transcriptText = await textResponse.text();
          const prompt = `Analiza el texto. ${generateSummary ? `Genera un resumen tipo "${summaryType}".` : ''} ${generateTags ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }, {role: "system", content: `Texto:\n---\n${transcriptText}`}],
            response_format: { type: "json_object" },
          });
          const result = JSON.parse(completion.choices[0].message.content || '{}');
          return { summary: result.summary || '', tags: result.tags || [] };
        });

        let summaryUrl: string | undefined;
        if (generateSummary && summary) {
          summaryUrl = await step.run('save-summary', async () => await saveTextToFile(summary, filename, 'summary.txt'));
        }

        await step.run('update-db-with-summary', async () => {
          const newMetadata = { ...metadata, tags: (generateTags && tags?.length) ? tags : undefined };
          await TranscriptionJobDB.updateResults(jobId, { metadata: newMetadata, summaryUrl });
          const textResponse = await fetch(job.txt_url!);
          const transcriptText = await textResponse.text();
          await logSummary(userId, Math.ceil(transcriptText.length / 4), Math.ceil(summary.length / 4));
        });

        await step.run('update-status-completed', async () => await TranscriptionJobDB.updateStatus(jobId, 'completed'));
        return { status: 'completed' };
      } catch (error: any) {
        console.error(`[CRITICAL] Job ${jobId} failed in summarizeFile:`, error);
        await step.run('mark-summary-as-failed', async () => {
            await TranscriptionJobDB.updateResults(jobId, { status: 'FAILED', error_message: `Summary Error: ${error.message}` });
        });
        throw error;
      }
  }
);

// --- FUNCIONES DE DOCUMENTOS CON DIAGNÓSTICO Y CORRECCIÓN ---
export const processDocument = inngest.createFunction(
  { id: 'task-process-document-openai-v2', name: 'Task: Process Document (OpenAI)', retries: 2, concurrency: { limit: 5 } },
  { event: 'task/process-document' },
  async ({ event, step }) => {
    const { jobId, documentUrl, filename, actions, language, summaryType } = event.data;
    try {
        const job = await TranscriptionJobDB.findById(jobId);
        if (!job) { throw new Error('Job not found'); }
        const { user_id: userId, metadata } = job;
        
        await step.run('update-status-doc-processing', async () => await TranscriptionJobDB.updateStatus(jobId, 'processing'));
        
        const { text: extractedText, metadata: parseMetadata } = await step.run('extract-text-from-doc', async () => {
          const { parseDocumentFromURL } = await import('@/lib/document-parser');
          return await parseDocumentFromURL(documentUrl, filename);
        });

        const txtUrl = await step.run('save-doc-text', async () => await saveTextToFile(extractedText, filename, 'extracted.txt'));

        await step.run('update-job-with-doc-text', async () => {
          await TranscriptionJobDB.updateResults(jobId, { txtUrl, metadata: { ...metadata, ...parseMetadata, actions, summaryType, isDocument: true } });
          await TranscriptionJobDB.updateStatus(jobId, 'transcribed');
        });

        let summaryUrl: string | undefined, tags: string[] | undefined;
        if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
          const result = await step.run('generate-doc-summary-openai', async () => {
            const prompt = `Analiza el texto de un documento. ${actions.includes('Resumir') ? `Genera un resumen tipo "${summaryType}".` : ''} ${actions.includes('Etiquetas') ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }, {role: "system", content: `Texto:\n---\n${extractedText}`}],
                response_format: { type: "json_object" },
            });
            const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
            const summary = aiResult.summary || '';
            const blobUrl = (actions.includes('Resumir') && summary) ? await saveTextToFile(summary, filename, 'summary.txt') : undefined;
            return { summaryUrl: blobUrl, tags: aiResult.tags || [] };
          });
          summaryUrl = result.summaryUrl; tags = result.tags;
        }

        await step.run('update-job-final-doc', async () => {
            await TranscriptionJobDB.updateResults(jobId, { metadata: { ...metadata, tags }, summaryUrl });
            if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
                await logSummary(userId, Math.ceil(extractedText.length / 4), Math.ceil((summaryUrl?.length || 0) / 4));
            }
        });

        await step.run('mark-doc-completed', async () => await TranscriptionJobDB.updateStatus(jobId, 'completed'));
        
        await step.run('cleanup-original-doc', async () => {
            try { await del(documentUrl, { token: process.env.BLOB_READ_WRITE_TOKEN! }); } catch (e: any) { console.warn(`Fallo al borrar doc (no-crítico):`, e.message); }
        });
        return { status: 'completed', jobId };
    } catch (error: any) {
        console.error(`[CRITICAL] Job ${jobId} failed in processDocument:`, error);
        await step.run('mark-doc-job-as-failed', async () => {
            await TranscriptionJobDB.updateResults(jobId, { status: 'FAILED', error_message: error.message });
        });
        throw error;
    }
  }
);

export const summarizeDocument = inngest.createFunction(
  { id: 'task-summarize-document-openai-v2', name: 'Task: Summarize Document (Legacy, OpenAI)', retries: 3 },
  { event: 'task/summarize-document' },
  async ({ event, step }) => {
    const { jobId, actions, text, language, summaryType } = event.data;
    try {
        const job = await TranscriptionJobDB.findById(jobId);
        if (!job) { throw new Error('Job not found'); }
        const { user_id: userId, filename, metadata } = job;
        
        const { summary, tags } = await step.run('generate-legacy-summary-openai', async () => {
            const prompt = `Analiza el texto. ${actions.includes('Resumir') ? `Genera un resumen tipo "${summaryType}".` : ''} ${actions.includes('Etiquetas') ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
            const completion = await

