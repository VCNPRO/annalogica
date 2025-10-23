// lib/inngest/functions.ts
// Exporta solo las funciones activas con Whisper y OpenAI

// Importa la función de transcripción con Whisper
export { default as transcribeFile } from '@/app/api/inngest/transcribe-audio';

// Mantén las funciones de documentos con OpenAI
import { inngest } from './client';
import { TranscriptionJobDB } from '@/lib/db';
import { logTranscription, logSummary } from '@/lib/usage-tracking';
import { put, del } from '@vercel/blob';
import OpenAI from "openai";

// Inicialización segura de OpenAI (solo si la key existe)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ---------- HELPERS ----------
const saveTextToFile = async (text: string, baseFilename: string, extension: string) => {
  const timestamp = Date.now();
  const filename = `${timestamp}-${baseFilename.replace(/\.[^/.]+$/, '')}-annalogica.${extension}`;
  const body = Buffer.from(text, "utf-8");

  const blob = await put(
    filename,
    body,
    {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      addRandomSuffix: true
    }
  );
  return blob.url;
};

const safeDeleteFromBlob = async (maybeBlobUrl: string) => {
  try {
    if (!/^https?:\/\/.*\.blob\.vercel-storage\.com\/.+/.test(maybeBlobUrl)) return;
    await del(maybeBlobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN! });
  } catch (e: any) {
    console.warn(`[BLOB] delete (no-crítico): ${e?.message || e}`);
  }
};

// ---------- RESUMEN DE AUDIO ----------
export const summarizeFile = inngest.createFunction(
  { id: 'task-summarize-file-openai-v2', name: 'Task: Summarize File (OpenAI)', retries: 2, concurrency: { limit: 5 } },
  { event: 'task/summarize' },
  async ({ event, step }) => {
    const { jobId, actions } = event.data;
    try {
      const job = await TranscriptionJobDB.findById(jobId);
      if (!job || !job.txt_url) { throw new Error('Job or transcript not found'); }

      const { user_id: userId, txt_url: txtUrl, filename, metadata } = job;
      const generateSummary = actions.includes('Resumir');
      const generateTags = actions.includes('Etiquetas');

      const textResponse = await fetch(txtUrl);
      const transcriptText = await textResponse.text();

      const { summary, tags } = await step.run('generate-summary-and-tags-openai', async () => {
        if (!openai) {
          throw new Error('OpenAI no configurado - falta OPENAI_API_KEY');
        }
        const prompt = `Analiza el texto transcrito. ${generateSummary ? 'Genera un resumen detallado.' : ''} ${generateTags ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }, { role: "system", content: `Texto:\n---\n${transcriptText}` }],
          response_format: { type: "json_object" },
        });
        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return { summary: result.summary || '', tags: result.tags || [] };
      });

      let summaryUrl: string | undefined;
      if (generateSummary && summary) {
        summaryUrl = await step.run('save-summary', async () => {
          return await saveTextToFile(summary, filename, 'summary.txt');
        });
      }

      await step.run('update-db-with-summary', async () => {
        const newMetadata = { ...metadata, tags: (generateTags && tags?.length) ? tags : undefined };
        await TranscriptionJobDB.updateResults(jobId, { metadata: newMetadata, summaryUrl });

        await logSummary(
          userId,
          Math.ceil(transcriptText.length / 4),
          Math.ceil(summary.length / 4)
        );
      });

      await step.run('update-status-completed', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'completed');
      });
      return { status: 'completed' };
    } catch (error: any) {
      console.error(`[CRITICAL] Job ${jobId} failed in summarizeFile:`, error);
      await step.run('mark-summary-as-failed', async () => {
        const job = await TranscriptionJobDB.findById(jobId);
        await TranscriptionJobDB.updateStatus(jobId, 'failed');
        await TranscriptionJobDB.updateResults(jobId, { metadata: { ...job?.metadata, error: `Summary Error: ${error.message}` } });
      });
      throw error;
    }
  }
);

// ---------- DOCUMENTOS ----------
export const processDocument = inngest.createFunction(
  { id: 'task-process-document-openai-v2', name: 'Task: Process Document (OpenAI)', retries: 2, concurrency: { limit: 5 } },
  { event: 'task/process-document' },
  async ({ event, step }) => {
    const { jobId, documentUrl, filename, actions, language, summaryType } = event.data;
    try {
      const job = await TranscriptionJobDB.findById(jobId);
      if (!job) { throw new Error('Job not found'); }

      const { user_id: userId, metadata } = job;

      await step.run('update-status-doc-processing', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'processing');
      });

      const { text: extractedText, metadata: parseMetadata } = await step.run('extract-text-from-doc', async () => {
        const { parseDocumentFromURL } = await import('@/lib/document-parser');
        return await parseDocumentFromURL(documentUrl, filename);
      });

      const txtUrl = await step.run('save-doc-text', async () => {
        return await saveTextToFile(extractedText, filename, 'extracted.txt');
      });

      await step.run('update-job-with-doc-text', async () => {
        await TranscriptionJobDB.updateResults(jobId, {
          txtUrl,
          metadata: { ...metadata, ...parseMetadata, actions, summaryType, isDocument: true }
        });
        await TranscriptionJobDB.updateStatus(jobId, 'transcribed');
      });

      let summaryUrl: string | undefined, tags: string[] | undefined;
      if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
        const result = await step.run('generate-doc-summary-openai', async () => {
          if (!openai) {
            throw new Error('OpenAI no configurado - falta OPENAI_API_KEY');
          }
          const prompt = `Analiza el texto de un documento. ${actions.includes('Resumir') ? `Genera un resumen tipo "${summaryType}".` : ''} ${actions.includes('Etiquetas') ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }, { role: "system", content: `Texto:\n---\n${extractedText}` }],
            response_format: { type: "json_object" },
          });
          const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
          const summary = aiResult.summary || '';
          const blobUrl = (actions.includes('Resumir') && summary)
            ? await saveTextToFile(summary, filename, 'summary.txt')
            : undefined;
          return { summaryUrl: blobUrl, tags: aiResult.tags || [] };
        });
        summaryUrl = result.summaryUrl; tags = result.tags;
      }

      await step.run('update-job-final-doc', async () => {
        await TranscriptionJobDB.updateResults(jobId, { metadata: { ...metadata, tags }, summaryUrl });
        if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
          await logSummary(
            userId,
            Math.ceil(extractedText.length / 4),
            Math.ceil((summaryUrl?.length || 0) / 4)
          );
        }
      });

      await step.run('mark-doc-completed', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'completed');
      });

      await step.run('cleanup-original-doc', async () => {
        await safeDeleteFromBlob(documentUrl);
      });

      return { status: 'completed', jobId };
    } catch (error: any) {
      console.error(`[CRITICAL] Job ${jobId} failed in processDocument:`, error);
      await step.run('mark-doc-job-as-failed', async () => {
        const job = await TranscriptionJobDB.findById(jobId);
        await TranscriptionJobDB.updateStatus(jobId, 'failed');
        await TranscriptionJobDB.updateResults(jobId, { metadata: { ...job?.metadata, error: error.message } });
      });
      throw error;
    }
  }
);

// ---------- LEGACY SUMMARY ----------
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
        if (!openai) {
          throw new Error('OpenAI no configurado - falta OPENAI_API_KEY');
        }
        const prompt = `Analiza el texto. ${actions.includes('Resumir') ? `Genera un resumen tipo "${summaryType}".` : ''} ${actions.includes('Etiquetas') ? 'Genera 5-10 etiquetas clave.' : ''} Responde en JSON con claves "summary" y "tags".`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }, { role: "system", content: `Texto:\n---\n${text}` }],
          response_format: { type: "json_object" },
        });
        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return { summary: result.summary || '', tags: result.tags || [] };
      });

      let summaryUrl: string | undefined;
      if (actions.includes('Resumir') && summary) {
        summaryUrl = await step.run('save-legacy-summary', async () => {
          return await saveTextToFile(summary, filename, 'summary.txt');
        });
      }

      await step.run('update-db-legacy-summary', async () => {
        await TranscriptionJobDB.updateResults(jobId, { metadata: { ...metadata, tags }, summaryUrl });
        await logSummary(
          userId,
          Math.ceil(text.length / 4),
          Math.ceil((summary?.length || 0) / 4)
        );
      });

      await step.run('update-status-legacy-completed', async () => {
        await TranscriptionJobDB.updateStatus(jobId, 'completed');
      });
      return { status: 'completed' };
    } catch (error: any) {
      console.error(`[CRITICAL] Job ${jobId} failed in summarizeDocument (Legacy):`, error);
      await step.run('mark-legacy-doc-job-as-failed', async () => {
        const job = await TranscriptionJobDB.findById(jobId);
        await TranscriptionJobDB.updateStatus(jobId, 'failed');
        await TranscriptionJobDB.updateResults(jobId, { metadata: { ...job?.metadata, error: error.message } });
      });
      throw error;
    }
  }
);
