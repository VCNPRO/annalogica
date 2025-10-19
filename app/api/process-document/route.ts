import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';
import { checkSubscriptionStatus, incrementUsage } from '@/lib/subscription-guard';

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

    // Trigger Inngest worker for document processing
    try {
      console.log('[ProcessDocument] About to send Inngest event:', {
        name: 'task/process-document',
        jobId: job.id,
        documentUrl: blobUrl,
        filename: fileName
      });

      const eventResult = await inngest.send({
        name: 'task/process-document',
        data: {
          jobId: job.id,
          documentUrl: blobUrl,
          filename: fileName,
          actions,
          language,
          summaryType
        }
      });

      console.log('[ProcessDocument] ✅ Inngest event sent successfully:', eventResult);
      console.log(`[ProcessDocument] Inngest worker triggered for job ${job.id}`);
    } catch (inngestError: any) {
      console.error('[ProcessDocument] ❌ FAILED to send Inngest event:', {
        error: inngestError.message,
        stack: inngestError.stack,
        jobId: job.id,
        eventName: 'task/process-document'
      });

      // Mark job as failed since we couldn't trigger processing
      await TranscriptionJobDB.updateStatus(job.id, 'failed');
      await TranscriptionJobDB.updateResults(job.id, {
        metadata: {
          actions,
          summaryType,
          isDocument: true,
          fileType: ext,
          error: `Error al enviar evento a Inngest: ${inngestError.message}`,
          errorTimestamp: new Date().toISOString()
        }
      });

      throw inngestError; // Re-throw to return 500 error to client
    }

    // Increment usage
    await incrementUsage(auth.userId);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Documento en cola de procesamiento',
      status: 'processing'
    });

  } catch (error: any) {
    console.error('[ProcessDocument] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
