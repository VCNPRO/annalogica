// app/api/jobs/[jobId]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';

/**
 * Este endpoint soporta:
 * - POST /api/jobs/[jobId]  -> ENCOLAR un nuevo job (ignora [jobId] del path; devuelve jobId real)
 *   Body: { url, filename, mime, size?, language?, actions?, summaryType? }
 * - GET  /api/jobs/[jobId]  -> ESTADO de un job existente
 *
 * Motivo de mantenerlo aquí: no cambiamos tu estructura de rutas.
 */

// Tipos admitidos (coinciden con el resto del backend)
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
   ========================= */
export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const job = await TranscriptionJobDB.findById(params.jobId);
    if (!job) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({
      id: params.jobId,
      status: job.status,                // 'pending' | 'processing' | 'transcribed' | 'summarized' | 'completed' | 'failed'
      progress: job.progress ?? undefined,
      error: job.metadata?.error ?? null,
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
  // Autenticación
  const auth = verifyRequestAuth(req);
  if (!auth) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  // Carga body
  let body: QueueBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 });
  }

  // Validación básica
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
    // 1) Crear job en DB (usa tu firma existente de 3–5 args)
    const job = await TranscriptionJobDB.create(auth.userId, filename, url, language, size);
    const jobId = (job as any)?.id || (job as any)?._id || (job as any)?.jobId;
    if (!jobId) throw new Error('No se pudo obtener jobId');

    // 2) Estado inicial visible para la UI
    //    (IMPORTANTE: usa estados que tu tipo admite: 'pending' y 'processing')
    await TranscriptionJobDB.updateStatus(jobId, 'pending');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: {
        enqueuedAt: new Date().toISOString(),
        mime,
        actions,
        summaryType,
      },
    });

    // 3) Disparar evento Inngest inmediatamente (audio/video vs docs)
    if (isAudio || isVideo) {
      await inngest.send({ name: 'task/transcribe', data: { jobId } });
    } else {
      await inngest.send({
        name: 'task/process-document',
        data: { jobId, documentUrl: url, filename, actions, language, summaryType },
      });
    }

    // 4) Hint optimista: pasa a 'processing' para que la barra arranque ya
    await TranscriptionJobDB.updateStatus(jobId, 'processing');

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
