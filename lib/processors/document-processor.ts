// lib/processors/document-processor.ts
// Direct document processing without Inngest
import OpenAI from 'openai';
import { put, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { getTranscriptionJob } from '@/lib/db/transcriptions';
import { TranscriptionJobDB } from '@/lib/db';
import { getDocumentAnalysisPrompt, normalizeLanguageCode } from '@/lib/prompts/multilingual';
import { trackError } from '@/lib/error-tracker';

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

    // STEP 1: Extract text from document
    console.log('[DocumentProcessor] Extracting text from document...');
    let extractedText: string;
    let parseMetadata: any;

    try {
      const { parseDocumentFromURL } = await import('@/lib/document-parser');
      const parseResult = await parseDocumentFromURL(documentUrl, filename);

      extractedText = parseResult.text;
      parseMetadata = parseResult.metadata;

      console.log('[DocumentProcessor] ✅ Text extracted:', {
        length: extractedText.length,
        metadata: parseMetadata
      });
    } catch (error: any) {
      console.error('[DocumentProcessor] RAW EXTRACTION ERROR:', error);
      const errorDetails = error.error || error.message || JSON.stringify(error, null, 2);
      const errorMsg = `Document text extraction failed: ${errorDetails}`;
      await trackError(
        'document_extraction_error',
        'critical',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName: filename,
            documentUrl: documentUrl.substring(0, 100),
            step: 'STEP 1: Document Text Extraction',
            errorType: error.constructor.name,
            errorStack: error.stack
          }
        }
      );
      await TranscriptionJobDB.updateStatus(jobId, 'failed');
      await TranscriptionJobDB.updateResults(jobId, {
        metadata: { ...metadata, error: errorMsg }
      });
      throw new Error(errorMsg);
    }

    // STEP 2: Validate PDF page count if applicable
    if (parseMetadata.pages && parseMetadata.method === 'unpdf') {
      try {
        const { validatePdfPages } = await import('@/lib/subscription-guard-v2');
        const pageValidation = await validatePdfPages(userId, parseMetadata.pages);

        if (!pageValidation.allowed) {
          const errorMsg = pageValidation.message ||
            `PDF tiene ${parseMetadata.pages} páginas. Límite: ${pageValidation.maxPages} páginas.`;

          await trackError(
            'pdf_page_limit_exceeded',
            'medium',
            errorMsg,
            new Error(errorMsg),
            {
              userId,
              metadata: {
                jobId,
                fileName: filename,
                pages: parseMetadata.pages,
                maxPages: pageValidation.maxPages,
                step: 'STEP 2: PDF Page Validation'
              }
            }
          );

          throw new Error(errorMsg);
        }

        console.log('[DocumentProcessor] ✅ PDF page count validated:', {
          pages: parseMetadata.pages,
          maxPages: pageValidation.maxPages
        });
      } catch (error: any) {
        if (error.message.includes('Límite')) {
          throw error; // Re-throw quota errors
        }

        await trackError(
          'pdf_page_validation_error',
          'high',
          `PDF page validation failed: ${error.message}`,
          error,
          {
            userId,
            metadata: {
              jobId,
              fileName: filename,
              pages: parseMetadata.pages,
              step: 'STEP 2: PDF Page Validation',
              errorType: error.constructor.name
            }
          }
        );
        throw error;
      }
    }

    // Prepare for output files
    const timestamp = Date.now();
    let summaryUrl: string | undefined;
    let summary: string | undefined;
    let tags: string[] | undefined;

    // STEP 3: Generate summary and tags if requested
    if (actions.includes('Resumir') || actions.includes('Etiquetas')) {
      console.log('[DocumentProcessor] Generating summary and tags...', { language });

      try {
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
        const rawSummary = aiResult.summary;
        summary = typeof rawSummary === 'object' ? JSON.stringify(rawSummary, null, 2) : rawSummary || '';
        tags = aiResult.tags || [];

        console.log('[DocumentProcessor] ✅ Summary and tags generated:', {
          summaryLength: summary?.length || 0,
          tagsCount: tags?.length || 0
        });
      } catch (error: any) {
        const errorMsg = `Summary/tags generation failed: ${error.message}`;
        await trackError(
          'document_ai_processing_error',
          'high',
          errorMsg,
          error,
          {
            userId,
            metadata: {
              jobId,
              fileName: filename,
              actions,
              summaryType,
              textLength: extractedText.length,
              step: 'STEP 3: Summary/Tags Generation',
              errorType: error.constructor.name,
              openAIError: error.response?.data || error.message
            }
          }
        );
        // Continue without summary/tags (non-fatal)
        console.error('[DocumentProcessor] Summary/tags generation failed (non-fatal):', error.message);
      }
    }

    // STEP 4: TTS - Generate audio narration if requested
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
        const audioFilename = `tts/${timestamp}-${filename.replace(/\.[^/.]+$/, '')}.mp3`;

        const ttsBlob = await put(audioFilename, buffer, {
          access: 'public',
          contentType: 'audio/mpeg',
          addRandomSuffix: true
        });

        ttsUrl = ttsBlob.url;
        console.log('[DocumentProcessor] ✅ TTS audio uploaded:', ttsUrl);

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
        const errorMsg = `TTS generation failed: ${ttsError.message}`;
        await trackError(
          'document_tts_error',
          'medium',
          errorMsg,
          ttsError,
          {
            userId,
            metadata: {
              jobId,
              fileName: filename,
              textLength: extractedText.length,
              step: 'STEP 4: TTS Generation',
              errorType: ttsError.constructor.name,
              openAIError: ttsError.response?.data || ttsError.message
            }
          }
        );
        // Continue processing even if TTS fails (non-fatal)
        console.error('[DocumentProcessor] TTS generation failed (non-fatal):', ttsError.message);
      }
    }

    // STEP 5: Generate Excel file
    console.log('[DocumentProcessor] Generating Excel file...');
    let excelBlob: any;

    try {
      const { generateDocumentExcel } = await import('@/lib/excel-generator');
      const excelBuffer = await generateDocumentExcel({
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

      excelBlob = await put(
        `documents/${jobId}.xlsx`,
        excelBuffer,
        { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', addRandomSuffix: true }
      );

      console.log('[DocumentProcessor] ✅ Excel generated');
    } catch (error: any) {
      const errorMsg = `Excel generation failed: ${error.message}`;
      await trackError(
        'document_excel_generation_error',
        'high',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName: filename,
            documentType: parseMetadata.method,
            pageCount: parseMetadata.pages,
            step: 'STEP 5: Excel Generation',
            errorType: error.constructor.name
          }
        }
      );
      throw new Error(errorMsg);
    }

    // STEP 6: Generate PDF with all data (with error handling)
    console.log('[DocumentProcessor] Generating PDF file...');
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

      console.log('[DocumentProcessor] ✅ PDF generated');
    } catch (pdfError: any) {
      const errorMsg = `PDF generation failed: ${pdfError.message}`;
      await trackError(
        'document_pdf_generation_error',
        'low',
        errorMsg,
        pdfError,
        {
          userId,
          metadata: {
            jobId,
            fileName: filename,
            step: 'STEP 6: PDF Generation',
            errorType: pdfError.constructor.name
          }
        }
      );
      // PDF generation is not critical, continue without it
      console.error('[DocumentProcessor] PDF generation failed (non-fatal):', pdfError.message);
    }

    // STEP 7: Save text files
    console.log('[DocumentProcessor] Saving text files...');
    let txtBlob: any;

    try {
      // Save extracted text (TXT)
      const txtFilename = `${timestamp}-${filename.replace(/\.[^/.]+$/, '')}-extracted.txt`;
      txtBlob = await put(txtFilename, Buffer.from(extractedText, 'utf-8'), {
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

      console.log('[DocumentProcessor] ✅ Text files saved');
    } catch (error: any) {
      const errorMsg = `Text file upload failed: ${error.message}`;
      await trackError(
        'document_file_upload_error',
        'critical',
        errorMsg,
        error,
        {
          userId,
          metadata: {
            jobId,
            fileName: filename,
            textLength: extractedText.length,
            step: 'STEP 7: File Upload',
            errorType: error.constructor.name
          }
        }
      );
      throw new Error(errorMsg);
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
        pdfUrl: pdfBlob?.url || null,
        ttsUrl: ttsUrl || null
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

    // Track general processing error
    await trackError(
      'document_processing_general_error',
      'critical',
      `Document processing failed: ${error.message}`,
      error,
      {
        metadata: {
          jobId,
          fileName: filename,
          documentUrl: documentUrl.substring(0, 100),
          actions,
          errorType: error.constructor.name
        }
      }
    );

    const job = await getTranscriptionJob(jobId);
    await TranscriptionJobDB.updateStatus(jobId, 'failed');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: { ...job?.metadata, error: error.message }
    });
    throw error;
  }
}
