// app/api/jobs/[jobId]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';

const AUDIO = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4','audio/m4a','audio/x-m4a'];
const VIDEO = ['video/mp4','video/mpeg','video/webm','video/quicktime','video/x-msvideo'];
const DOCS  = ['text/plain','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

type QueueBody = {
  url: string;
  filename: string;
  mime: string;
  size?: number;
  language?: string;
  actions?: string[];
  summaryType?: string;
};

/* =========================
   GET -> estado por jobId
   (⚠️ sin tipar el segundo argumento para evitar el error)
   ========================= */
export async function GET(_req: Request, context: any) {
  try {
    const jobId: string | undefined =
      context?.params?.jobId ?? context?.params?.id ?? context?.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'missing_jobId', id: null, status: null, metadata: {} },
        { status: 400 }
      );
    }

    const job = await TranscriptionJobDB.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'not_found', id: jobId, status: null, metadata: {} },
        { status: 404 }
      );
    }

    const metadata = job.metadata ?? {};
    const progress =
      typeof metadata.progress === 'number' ? metadata.progress : undefined;

    return NextResponse.json({
      id: jobId,
      status: job.status,       // 'pending' | 'processing' | 'transcribed' | 'summarized' | 'completed' | 'failed'
      progress,
      metadata,                 // para compatibilidad con tu UI
      error: metadata.error ?? null,
      updatedAt: job.updated_at ? new Date(job.updated_at).toISOString() : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'status_error' }, { status: 500 });
  }
}

/* =========================
   POST -> encola un job nuevo
   ========================= */
export async function POST(req: NextRequest) {
  const auth = verifyRequestAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  let body: QueueBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 });
  }

  const { url, filename, mime, size = 0, language = 'auto', actions = [], summaryType } = body;
  if (!url || !filename || !mime) {
    return NextResponse.json({ success: false, message: 'Faltan campos: url/filename/mime' }, { status: 400 });
  }

  const m = mime.toLowerCase();
  const isAudio = AUDIO.includes(m);
  const isVideo = VIDEO.includes(m);
  const isDoc   = DOCS.includes(m);
  if (!isAudio && !isVideo && !isDoc) {
    return NextResponse.json({ success: false, message: `Tipo no permitido: ${mime}` }, { status: 415 });
  }

  try {
    // 1) Crear job en DB
    const job = await TranscriptionJobDB.create(auth.userId, filename, url, language, size);
    const jobId = (job as any)?.id || (job as any)?._id || (job as any)?.jobId;
    if (!jobId) throw new Error('No se pudo obtener jobId');

    // 2) Estado inicial + metadata mínima (incluye progress para la barra)
    await TranscriptionJobDB.updateStatus(jobId, 'pending');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: {
        enqueuedAt: new Date().toISOString(),
        mime,
        actions,
        summaryType,
        progress: 5,
      },
    });

    // 3) Enviar evento
    if (isAudio || isVideo) {
      await inngest.send({ name: 'task/transcribe', data: { jobId } });
    } else {
      await inngest.send({
        name: 'task/process-document',
        data: { jobId, documentUrl: url, filename, actions, language, summaryType },
      });
    }

    // 4) Hint optimista: pasa a 'processing' y sube progreso
    await TranscriptionJobDB.updateStatus(jobId, 'processing');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: { startedAt: new Date().toISOString(), progress: 20 },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Job creado y encolado',
        data: { jobId, mime, queuedAt: new Date().toISOString() },
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('[jobs/[jobId]] enqueue error:', e?.message || e);
    return NextResponse.json({ success: false, message: e?.message || 'Error encolar job' }, { status: 500 });
  }
}
