// lib/processors/document-processor.ts
// Direct document processing without Inngest
import OpenAI from 'openai';
import { put, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
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

    // Get user's client_id
    let clientId: number | undefined;
    try {
      const userResult = await sql`SELECT client_id FROM users WHERE id = ${userId}`;
      if (userResult.rows.length > 0) {
        clientId = userResult.rows[0].client_id;
        console.log('[DocumentProcessor] User client_id:', clientId);
      }
    } catch (error) {
      console.error('[DocumentProcessor] Error fetching user client_id:', error);
      // Continue without client_id
    }

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

    // Prepare for output files
    const timestamp = Date.now();
    let summaryUrl: string | undefined;
    let summary: string | undefined;
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
      summary = aiResult.summary || '';
      tags = aiResult.tags || [];

      console.log('[DocumentProcessor] Summary and tags generated');
    }

    // Generate output files (Excel, PDF, TXT)
    console.log('[DocumentProcessor] Generating output files (Excel, PDF, TXT)...');

    // Generate Excel file with all data
    const { generateDocumentExcel } = await import('@/lib/excel-generator');
    const excelBuffer = await generateDocumentExcel({
      clientId,
      filename,
      title: undefined, // Could extract from first lines of text
      documentType: parseMetadata.method === 'unpdf' ? 'PDF' : parseMetadata.method === 'mammoth' ? 'DOCX' : 'TXT',
      pageCount: parseMetadata.pages,
      extractedText,
      summary,
      tags,
      language,
      processingDate: new Date()
    });

    const excelBlob = await put(
      `documents/${jobId}.xlsx`,
      excelBuffer,
      { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', addRandomSuffix: true }
    );

    console.log('[DocumentProcessor] Excel generated');

    // Generate PDF with all data (with error handling)
    let pdfBlob: any = null;
    try {
      const { generateDocumentPDF } = await import('@/lib/results-pdf-generator');
      const pdfBuffer = await generateDocumentPDF({
        clientId,
        filename,
        title: undefined,
        documentType: parseMetadata.method === 'unpdf' ? 'PDF' : parseMetadata.method === 'mammoth' ? 'DOCX' : 'TXT',
        pageCount: parseMetadata.pages,
        extractedText,
        summary,
        tags,
        language,
        processingDate: new Date()
      });

      pdfBlob = await put(
        `documents/${jobId}.pdf`,
        pdfBuffer,
        { access: 'public', contentType: 'application/pdf', addRandomSuffix: true }
      );

      console.log('[DocumentProcessor] PDF generated');
    } catch (pdfError: any) {
      console.error('[DocumentProcessor] PDF generation failed (non-fatal):', pdfError.message);
      // PDF generation is not critical, continue without it
    }

    // Save extracted text (TXT)
    const txtFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-extracted.txt`;
    const txtBlob = await put(txtFilename, extractedText, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      addRandomSuffix: true
    });

    // Save summary if generated
    if (summary) {
      const summaryFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-summary.txt`;
      const summaryBlob = await put(summaryFilename, summary, {
        access: 'public',
        contentType: 'text/plain; charset=utf-8',
        addRandomSuffix: true
      });
      summaryUrl = summaryBlob.url;
    }

    console.log('[DocumentProcessor] All output files saved');

    // Update job with final results
    await TranscriptionJobDB.updateResults(jobId, {
      txtUrl: txtBlob.url,
      summaryUrl,
      metadata: {
        ...metadata,
        ...parseMetadata,
        actions,
        summaryType,
        isDocument: true,
        tags,
        excelUrl: excelBlob.url,
        pdfUrl: pdfBlob.url
      }
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
