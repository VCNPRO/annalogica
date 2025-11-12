// lib/processors/document-processor.ts
// Direct document processing without Inngest
import OpenAI from 'openai';
import { put, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { getTranscriptionJob } from '@/lib/db/transcriptions';
import { TranscriptionJobDB } from '@/lib/db';
import { getDocumentAnalysisPrompt, normalizeLanguageCode } from '@/lib/prompts/multilingual';

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
      console.log('[DocumentProcessor] Generating summary and tags...', { language });

      // Normalize language for prompts
      const promptLanguage = normalizeLanguageCode(language);
      const prompt = getDocumentAnalysisPrompt(promptLanguage, actions, summaryType as 'short' | 'detailed');

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

    // 🎤 TTS: Generate audio narration if requested
    let ttsUrl: string | undefined;
    if (actions.includes('GenerarAudio') || actions.includes('TTS')) {
      console.log('[DocumentProcessor] Generating audio with TTS...');

      try {
        // Use summary if available, otherwise use first 4000 chars of text
        const textToNarrate = summary
          ? summary
          : extractedText.substring(0, 4000);

        // Validate text length (OpenAI limit: 4096 chars)
        if (textToNarrate.length > 4096) {
          console.warn('[DocumentProcessor] Text too long for TTS, truncating to 4096 chars');
        }

        const textForTTS = textToNarrate.substring(0, 4096);

        // Call OpenAI TTS directly (server-side, no auth needed)
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: textForTTS,
          response_format: 'mp3',
          speed: 1.0
        });

        // Convert to buffer
        const buffer = Buffer.from(await mp3.arrayBuffer());

        console.log('[DocumentProcessor] TTS audio generated:', {
          sizeBytes: buffer.length,
          sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
        });

        // Upload to Vercel Blob
        const timestamp = Date.now();
        const audioFilename = `tts/${timestamp}-${filename.replace(/\.[^/.]+$/, '')}.mp3`;

        const ttsBlob = await put(audioFilename, buffer, {
          access: 'public',
          contentType: 'audio/mpeg',
          addRandomSuffix: true
        });

        ttsUrl = ttsBlob.url;
        console.log('[DocumentProcessor] TTS audio uploaded:', ttsUrl);

        // Log usage for analytics
        try {
          await sql`
            INSERT INTO ai_usage_log (
              user_id,
              service,
              model,
              input_tokens,
              output_tokens,
              cost_usd,
              metadata
            ) VALUES (
              ${userId},
              'openai-tts',
              'tts-1',
              ${textForTTS.length},
              0,
              ${(textForTTS.length / 1_000_000) * 15},
              ${JSON.stringify({ voice: 'nova', textLength: textForTTS.length, audioSize: buffer.length })}
            )
          `;
        } catch (logError) {
          console.error('[DocumentProcessor] Failed to log TTS usage (non-fatal):', logError);
        }

      } catch (ttsError: any) {
        console.error('[DocumentProcessor] TTS generation failed (non-fatal):', ttsError.message);
        // Continue processing even if TTS fails
      }
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
    const txtBlob = await put(txtFilename, Buffer.from(extractedText, 'utf-8'), {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      addRandomSuffix: true
    });

    // Save summary if generated
    if (summary) {
      const summaryFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-summary.txt`;
      const summaryBlob = await put(summaryFilename, Buffer.from(summary, 'utf-8'), {
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
        pdfUrl: pdfBlob?.url || null, // 🔥 FIX: pdfBlob puede ser null si la generación falla
        ttsUrl: ttsUrl || null // 🎤 URL del audio narrado (si se generó)
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
