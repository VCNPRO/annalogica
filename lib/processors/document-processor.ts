// lib/processors/document-processor.ts
// Direct document processing without Inngest
import OpenAI from 'openai';
import { put, del } from '@vercel/blob';
import { getTranscriptionJob } from '@/lib/db/transcriptions';
import { TranscriptionJobDB } from '@/lib/db';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Process document file directly (no Inngest)
 */
export async function processDocumentFile(
  jobId: string,
  documentUrl: string,
  filename: string,
  actions: string[],
  language: string,
  summaryType: string
): Promise<void> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    console.log('[DocumentProcessor] Starting processing for job:', jobId);

    const job = await getTranscriptionJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const { user_id: userId, metadata } = job;

    // Update status to processing
    await TranscriptionJobDB.updateStatus(jobId, 'processing');

    // Extract text from document
    console.log('[DocumentProcessor] Extracting text from document...');
    const { parseDocumentFromURL } = await import('@/lib/document-parser');
    const { text: extractedText, metadata: parseMetadata } = await parseDocumentFromURL(
      documentUrl,
      filename
    );

    console.log('[DocumentProcessor] Text extracted:', {
      length: extractedText.length,
      metadata: parseMetadata
    });

    // Validate PDF page count if applicable
    if (parseMetadata.pages && parseMetadata.method === 'unpdf') {
      const { validatePdfPages } = await import('@/lib/subscription-guard-v2');
      const pageValidation = await validatePdfPages(userId, parseMetadata.pages);

      if (!pageValidation.allowed) {
        throw new Error(
          pageValidation.message ||
          `PDF tiene ${parseMetadata.pages} páginas. Límite: ${pageValidation.maxPages} páginas.`
        );
      }

      console.log('[DocumentProcessor] PDF page count validated:', {
        pages: parseMetadata.pages,
        maxPages: pageValidation.maxPages
      });
    }

    // Save extracted text to blob
    const timestamp = Date.now();
    const txtFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-extracted.txt`;
    const txtBlob = await put(txtFilename, extractedText, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      addRandomSuffix: true
    });

    // Update job with extracted text
    await TranscriptionJobDB.updateResults(jobId, {
      txtUrl: txtBlob.url,
      metadata: {
        ...metadata,
        ...parseMetadata,
        actions,
        summaryType,
        isDocument: true
      }
    });
    await TranscriptionJobDB.updateStatus(jobId, 'transcribed');

    let summaryUrl: string | undefined;
    let tags: string[] | undefined;

    // Generate summary and tags if requested
    if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
      console.log('[DocumentProcessor] Generating summary and tags...');

      const prompt = `Analiza el texto de un documento. ${
        actions.includes('Resumir')
          ? `Genera un resumen tipo "${summaryType}".`
          : ''
      } ${
        actions.includes('Etiquetas') ? 'Genera 5-10 etiquetas clave.' : ''
      } Responde en JSON con claves "summary" y "tags".`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt },
          { role: "system", content: `Texto:\n---\n${extractedText}` }
        ],
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
      const summary = aiResult.summary || '';
      tags = aiResult.tags || [];

      // Save summary if generated
      if (actions.includes('Resumir') && summary) {
        const summaryFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-summary.txt`;
        const summaryBlob = await put(summaryFilename, summary, {
          access: 'public',
          contentType: 'text/plain; charset=utf-8',
          addRandomSuffix: true
        });
        summaryUrl = summaryBlob.url;
      }

      console.log('[DocumentProcessor] Summary and tags generated');
    }

    // Update job with final results
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: { ...metadata, tags },
      summaryUrl
    });

    await TranscriptionJobDB.updateStatus(jobId, 'completed');

    // Delete original document file to save storage costs
    console.log('[DocumentProcessor] Deleting original document file to save storage...');
    try {
      await del(documentUrl);
      console.log('[DocumentProcessor] ✅ Original document file deleted:', documentUrl);
    } catch (deleteError: any) {
      // Don't fail the whole job if deletion fails, just log it
      console.error('[DocumentProcessor] ⚠️  Warning: Could not delete original document file:', deleteError.message);
      console.error('[DocumentProcessor] URL:', documentUrl);
    }

    console.log('[DocumentProcessor] Processing completed successfully:', jobId);

  } catch (error: any) {
    console.error('[DocumentProcessor] Error processing document:', error);
    const job = await getTranscriptionJob(jobId);
    await TranscriptionJobDB.updateStatus(jobId, 'failed');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: { ...job?.metadata, error: error.message }
    });
    throw error;
  }
}
