import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { checkSubscriptionStatus, incrementUsage } from '@/lib/subscription-guard';
import { processDocumentFile } from '@/lib/processors/document-processor';

// Configure maximum execution time for document processing
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/process-document
 *
 * Professional server-side document processing (PDF, DOCX, TXT)
 *
 * Architecture:
 * 1. Client uploads document to Vercel Blob
 * 2. Client sends blob URL + metadata to this endpoint
 * 3. Endpoint creates job and triggers Inngest worker
 * 4. Inngest worker downloads, parses, and processes document
 *
 * This matches the audio/video architecture for consistency.
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

    const body = await request.json();

    const {
      blobUrl,
      fileName,
      actions = [],
      summaryType = 'detailed',
      language = 'es'
    } = body;

    // Validate required fields
    if (!blobUrl || !fileName) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: blobUrl, fileName' },
        { status: 400 }
      );
    }

    // Validate file type from extension
    const ext = fileName.toLowerCase().split('.').pop();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      return NextResponse.json(
        { error: `Tipo de archivo no soportado: .${ext}. Solo se permiten PDF, DOCX, TXT.` },
        { status: 400 }
      );
    }

    console.log(`[ProcessDocument] Creating job for ${fileName} (${ext})`);

    // Create job in database
    const job = await TranscriptionJobDB.create(
      auth.userId,
      fileName,
      blobUrl, // Store document URL in audio_url field
      language
    );

    // Update job metadata
    await TranscriptionJobDB.updateResults(job.id, {
      metadata: {
        actions,
        summaryType,
        isDocument: true,
        fileType: ext
      }
    });

    // Mark as pending (processing will start in Inngest worker)
    await TranscriptionJobDB.updateStatus(job.id, 'pending');

    console.log(`[ProcessDocument] Job created: ${job.id}`);

    // Process document synchronously (wait for completion before responding)
    // This is necessary because Vercel Functions terminate after sending response
    // For beta with PDFs this is acceptable (typically <60 seconds)
    try {
      console.log('[ProcessDocument] Starting synchronous processing:', job.id);
      await processDocumentFile(job.id, blobUrl, fileName, actions, language, summaryType);
      console.log('[ProcessDocument] Processing completed successfully:', job.id);

      // Increment usage after successful processing
      await incrementUsage(auth.userId);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: 'Documento procesado exitosamente',
        status: 'completed'
      });
    } catch (error: any) {
      console.error('[ProcessDocument] Processing failed:', {
        error: error.message,
        stack: error.stack,
        jobId: job.id
      });

      return NextResponse.json({
        success: false,
        jobId: job.id,
        message: 'Error procesando el documento',
        status: 'failed',
        error: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[ProcessDocument] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
