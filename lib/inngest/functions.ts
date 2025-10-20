// DÓNDE: lib/inngest/functions.ts
// MISIÓN: Migrar las funciones de documentos a OpenAI y reactivarlas.

import { inngest } from './client';
import { TranscriptionJobDB } from '@/lib/db';
import { logTranscription, logSummary } from '@/lib/usage-tracking';
import { put, del } from '@vercel/blob';
import { createClient } from "@deepgram/sdk";
import OpenAI from "openai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// --- HELPERS (sin cambios) ---
const saveTextToFile = async (text: string, baseFilename: string, extension: string) => { /* ... */ };
const formatTimestamp = (seconds: number) => { /* ... */ };
const generateSrt = (utterances: any[]) => { /* ... */ };
const generateVtt = (utterances: any[]) => { /* ... */ };

// --- FUNCIONES DE AUDIO (ya migradas, sin cambios) ---
export const transcribeFile = inngest.createFunction(/* ... */);
export const summarizeFile = inngest.createFunction(/* ... */);


// --- ¡FUNCIÓN DE DOCUMENTOS ACTUALIZADA! ---
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

    await step.run('update-status-doc-processing', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
    });

    const { extractedText, parseMetadata } = await step.run('extract-text-from-doc', async () => {
      const { parseDocumentFromURL } = await import('@/lib/document-parser');
      return await parseDocumentFromURL(documentUrl, filename);
    });

    const txtUrl = await step.run('save-doc-text', async () => await saveTextToFile(extractedText, filename, 'extracted.txt'));

    await step.run('update-job-with-doc-text', async () => {
      await TranscriptionJobDB.updateResults(jobId, { txtUrl, metadata: { ...metadata, ...parseMetadata, actions, summaryType, isDocument: true } });
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

    await step.run('update-job-final-doc', async () => {
      const updateData: any = { metadata: { ...metadata, tags }, summaryUrl };
      await TranscriptionJobDB.updateResults(jobId, updateData);
      if (generateSummary || generateTags) {
        await logSummary(userId, Math.ceil(extractedText.length / 4), Math.ceil((summaryUrl?.length || 0) / 4));
      }
    });

    await step.run('mark-doc-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });
    
    await step.run('cleanup-original-doc', async () => {
        try { await del(documentUrl, { token: process.env.BLOB_READ_WRITE_TOKEN! }); } catch (e: any) { console.warn(`Fallo al borrar doc (no-crítico):`, e.message); }
    });

    return { status: 'completed', jobId };
  }
);

// --- ¡FUNCIÓN DE DOCUMENTOS LEGACY ACTUALIZADA! ---
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

    const { summary, tags } = await step.run('generate-legacy-summary-openai', async () => {
        const prompt = `Analiza el siguiente texto. ${generateSummary ? `Genera un resumen de tipo "${summaryType}".` : ''} ${generateTags ? 'Genera una lista de 5 a 10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
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
        summaryUrl = await step.run('save-legacy-summary', async () => await saveTextToFile(summary, filename, 'summary.txt'));
    }

    await step.run('update-db-legacy-summary', async () => {
      const updateData: any = { metadata: { ...metadata, tags }, summaryUrl };
      await TranscriptionJobDB.updateResults(jobId, updateData);
      await logSummary(userId, Math.ceil(text.length / 4), Math.ceil((summary?.length || 0) / 4));
    });

    await step.run('update-status-legacy-completed', async () => {
      await TranscriptionJobDB.updateStatus(jobId, 'completed');
    });

    return { status: 'completed' };
  }
);

