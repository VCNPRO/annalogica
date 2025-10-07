import { NextRequest } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

/**
 * GET /api/jobs/[id]
 * Get job status and results (for frontend polling)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Find job
    const job = await TranscriptionJobDB.findById(id);

    if (!job) {
      return Response.json(
        { error: 'Job no encontrado' },
        { status: 404 }
      );
    }

    // SECURITY: Verify job belongs to user
    if (job.user_id !== user.userId) {
      return Response.json(
        { error: 'No tienes permiso para ver este job' },
        { status: 403 }
      );
    }

    // Return job status
    return Response.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        filename: job.filename,
        audioUrl: job.audio_url,
        txtUrl: job.txt_url,
        srtUrl: job.srt_url,
        vttUrl: job.vtt_url,
        summaryUrl: job.summary_url,
        errorMessage: job.error_message,
        retryCount: job.retry_count,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at
      }
    });
  } catch (error: any) {
    console.error('[API Jobs] Error:', error);
    return Response.json(
      { error: error.message || 'Error al obtener job' },
      { status: 500 }
    );
  }
}
