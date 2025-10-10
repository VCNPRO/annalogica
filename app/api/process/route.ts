import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';

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
