import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export async function GET(request: NextRequest, context: any) {
  try {
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { jobId } = context.params;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
    }

    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Trabajo no encontrado o no autorizado' }, { status: 404 });
    }

    // Don't expose audio_url (original file deleted after processing)
    const { audio_url, ...jobWithoutAudioUrl } = job;

    return NextResponse.json({ job: jobWithoutAudioUrl });

  } catch (error: any) {
    console.error(`[API Job ${context.params.jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error al obtener el trabajo' }, { status: 500 });
  }
}
