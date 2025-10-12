import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';
import { checkSubscriptionStatus, incrementUsage } from '@/lib/subscription-guard';

// API endpoint for creating async transcription jobs
/**
 * POST /api/process
 * Create transcription job (async) - returns immediately
 * Job will be processed in background by Inngest
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Verify authentication
    console.log('[API Process] Verificando autenticación...');
    console.log('[API Process] Authorization header:', request.headers.get('Authorization')?.substring(0, 50) + '...');

    const user = verifyRequestAuth(request);
    console.log('[API Process] Usuario verificado:', user ? { userId: user.userId, email: user.email } : null);

    if (!user) {
      console.error('[API Process] Autenticación fallida');
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // QUOTA: Check subscription status and quota
    console.log('[API Process] Verificando cuota de suscripción...');
    const subscriptionStatus = await checkSubscriptionStatus(user.userId);

    if (!subscriptionStatus.canUpload) {
      console.error('[API Process] Cuota excedida:', {
        userId: user.userId,
        usage: subscriptionStatus.usage,
        quota: subscriptionStatus.quota
      });
      return Response.json(
        {
          error: subscriptionStatus.message || 'Has alcanzado el límite de tu plan',
          code: 'QUOTA_EXCEEDED',
          quota: subscriptionStatus.quota,
          usage: subscriptionStatus.usage,
          remaining: subscriptionStatus.remaining,
          upgradeUrl: subscriptionStatus.upgradeUrl
        },
        { status: 403 }
      );
    }

    console.log('[API Process] Cuota verificada - Archivos disponibles:', subscriptionStatus.remaining);

    // SECURITY: Rate limiting
    const identifier = getClientIdentifier(request, user.userId);
    const rateLimitResponse = await checkRateLimit(
      processRateLimit,
      identifier,
      'transcripciones procesadas'
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { audioUrl, filename } = await request.json();

    if (!audioUrl || !filename) {
      return Response.json(
        { error: 'audioUrl y filename son requeridos' },
        { status: 400 }
      );
    }

    // Create job in database
    const job = await TranscriptionJobDB.create(
      user.userId,
      filename,
      audioUrl
    );

    console.log('[API Process] Job created:', job.id, { filename, audioUrl });

    // Send job to Inngest queue for async processing
    await inngest.send({
      name: 'task/transcribe',
      data: {
        jobId: job.id,
        userId: user.userId,
        audioUrl,
        filename
      }
    });

    console.log('[API Process] Job sent to Inngest:', job.id);

    // QUOTA: Increment usage counter after successful job creation
    try {
      await incrementUsage(user.userId);
      console.log('[API Process] Uso incrementado para usuario:', user.userId);
    } catch (error) {
      console.error('[API Process] Error incrementando uso:', error);
      // Don't fail the request if usage increment fails
    }

    // Return immediately with job ID
    // Frontend will poll /api/jobs/:id for status
    return Response.json({
      success: true,
      message: 'Transcripción en proceso. Esto puede tardar 1-3 minutos.',
      jobId: job.id,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('[API Process] Error:', error);
    return Response.json(
      { error: error.message || 'Error al procesar transcripción' },
      { status: 500 }
    );
  }
}
