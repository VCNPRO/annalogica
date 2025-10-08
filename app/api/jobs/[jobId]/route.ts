import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
    }

    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Trabajo no encontrado o no autorizado' }, { status: 404 });
    }

    return NextResponse.json({ job });

  } catch (error: any) {
    console.error(`[API Job ${params.jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error al obtener el trabajo' }, { status: 500 });
  }
}
