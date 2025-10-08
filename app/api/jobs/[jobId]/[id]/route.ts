import { NextRequest } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

// API endpoint to check transcription job status
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

    // Get job ID from params
    const { id } = await context.params;

    // Fetch job from database
    const job = await TranscriptionJobDB.findById(id);

    if (!job) {
      return Response.json({ error: 'Job no encontrado' }, { status: 404 });
    }

    // SECURITY: Verify user owns this job
    if (job.user_id !== user.userId) {
      return Response.json({ error: 'No tienes permiso para ver este job' }, { status: 403 });
    }

    // Return job status and results
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
        audioDuration: job.audio_duration_seconds,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at
      }
    });

  } catch (error: any) {
    console.error('[API Jobs] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
