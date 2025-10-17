import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';
import { checkSubscriptionStatus, incrementUsage } from '@/lib/subscription-guard';
import { put } from '@vercel/blob';
import mammoth from 'mammoth';

/**
 * POST /api/process-document
 * Process text documents (PDF, TXT, DOCX) for summarization, tags, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Check subscription quota
    const subscriptionStatus = await checkSubscriptionStatus(auth.userId);
    if (!subscriptionStatus.canUpload) {
      return NextResponse.json(
        {
          error: subscriptionStatus.message || 'Has alcanzado el límite de tu plan',
          quota: subscriptionStatus.quota,
          usage: subscriptionStatus.usage,
          resetDate: subscriptionStatus.resetDate
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const actions = JSON.parse(formData.get('actions') as string || '[]');
    const summaryType = formData.get('summaryType') as 'short' | 'detailed' || 'detailed';
    const language = formData.get('language') as string || 'es';

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Extract text based on file type
    let extractedText = '';
    const fileType = file.type;
    const fileName = file.name;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileType === 'application/pdf') {
        // Extract text from PDF using dynamic import
        console.log('[Document] Extracting text from PDF:', fileName);
        const { PDFParse } = await import('pdf-parse');
        const pdfData = await new PDFParse().parse(buffer);
        extractedText = pdfData.text;
        console.log('[Document] PDF text extracted, length:', extractedText.length);

      } else if (fileType === 'text/plain') {
        // Extract text from TXT
        console.log('[Document] Reading plain text file:', fileName);
        extractedText = buffer.toString('utf-8');
        console.log('[Document] TXT text extracted, length:', extractedText.length);

      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        // Extract text from DOCX
        console.log('[Document] Extracting text from DOCX:', fileName);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        console.log('[Document] DOCX text extracted, length:', extractedText.length);

      } else {
        return NextResponse.json(
          { error: `Tipo de archivo no soportado: ${fileType}. Solo se permiten PDF, TXT y DOCX.` },
          { status: 400 }
        );
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No se pudo extraer texto del documento. El archivo puede estar vacío o dañado.' },
          { status: 400 }
        );
      }

      // Save extracted text to Vercel Blob
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (!blobToken) {
        throw new Error('BLOB_READ_WRITE_TOKEN not configured');
      }

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const timestamp = Date.now();
      const txtBlob = await put(`${timestamp}-${baseName}-extracted.txt`, extractedText, {
        access: 'public',
        contentType: 'text/plain; charset=utf-8',
        token: blobToken,
        addRandomSuffix: true
      });

      console.log('[Document] Text saved to Vercel Blob:', txtBlob.url);

      // Create a job in the database
      // Use a special "document" type to differentiate from audio/video
      const job = await TranscriptionJobDB.create(
        auth.userId,
        fileName,
        txtBlob.url, // Store the text blob URL as the "audio_url"
        language
      );

      // Update job metadata and mark as already "transcribed" since we have the text
      await TranscriptionJobDB.updateResults(job.id, {
        txtUrl: txtBlob.url,
        metadata: {
          actions,
          summaryType,
          isDocument: true, // Flag to indicate this is a document, not audio/video
          originalFileType: fileType,
          textLength: extractedText.length
        }
      });

      await TranscriptionJobDB.updateStatus(job.id, 'transcribed');

      console.log('[Document] Job created and marked as transcribed:', job.id);

      // If actions include summary or tags, trigger the summarization task
      const needsSummaryOrTags = actions.includes('Resumir') || actions.includes('Etiquetas');

      if (needsSummaryOrTags) {
        console.log('[Document] Triggering summarization for document:', job.id);

        // For documents, we need to create a mock AssemblyAI transcript ID
        // Or we can directly process with Claude without using AssemblyAI
        // Let's send to the document summarization endpoint
        await inngest.send({
          name: 'task/summarize-document',
          data: {
            jobId: job.id,
            actions,
            text: extractedText, // Pass text directly
            language,
            summaryType
          }
        });
      } else {
        // No summary/tags needed, mark as completed
        await TranscriptionJobDB.updateStatus(job.id, 'completed');
      }

      // Increment usage
      await incrementUsage(auth.userId);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: 'Documento procesado correctamente',
        status: needsSummaryOrTags ? 'processing' : 'completed'
      });

    } catch (extractionError: any) {
      console.error('[Document] Error extracting text:', extractionError);
      return NextResponse.json(
        { error: `Error al procesar el documento: ${extractionError.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[Document] Error processing document:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
