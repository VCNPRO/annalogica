// app/api/jobs/queue/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';

// Tipos admitidos
const AUDIO = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4','audio/m4a','audio/x-m4a'];
const VIDEO = ['video/mp4','video/mpeg','video/webm','video/quicktime','video/x-msvideo'];
const DOCS  = ['text/plain','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

type QueueBody = {
  url: string;           // Blob público (p.ej. https://...public.blob.vercel-storage.com/...)
  filename: string;
  mime: string;
  size?: number;
  language?: string;     // 'auto' por defecto
  actions?: string[];    // ['Transcribir','Resumir','Subtítulos','Oradores'] etc.
  summaryType?: string;  // p.ej. 'detailed'
};

export async function POST(req: NextRequest) {
  // Auth
  const auth = verifyRequestAuth(req);
  if (!auth) return NextResponse.json({ success:false, message:'No autenticado' }, { status:401 });

  let body: QueueBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success:false, message:'JSON inválido' }, { status:400 });
  }

  const { url, filename, mime, size = 0, language = 'auto', actions = [], summaryType } = body;

  // Validaciones mínimas
  if (!url || !filename || !mime) {
    return NextResponse.json({ success:false, message:'Faltan campos: url/filename/mime' }, { status:400 });
  }

  const m = mime.toLowerCase();
  const isAudio = AUDIO.includes(m);
  const isVideo = VIDEO.includes(m);
  const isDoc   = DOCS.includes(m);
  if (!isAudio && !isVideo && !isDoc) {
    return NextResponse.json({ success:false, message:`Tipo no permitido: ${mime}` }, { status:415 });
  }

  try {
    // 1) Crear el job en DB
    const tCreate = Date.now();
    const job = await TranscriptionJobDB.create(
      auth.userId,
      filename,
      url,            // URL del Blob
      language,
      size
    );
    const jobId = (job as any)?.id || (job as any)?._id || (job as any)?.jobId;
    if (!jobId) throw new Error('No se pudo obtener jobId');

    // Estado “en cola” visible en la UI (usa 'pending' según tu tipo)
    await TranscriptionJobDB.updateStatus(jobId, 'pending');
    await TranscriptionJobDB.updateResults(jobId, {
      metadata: {
        enqueuedAt: new Date().toISOString(),
        mime,
        actions,
        summaryType,
      },
    });

    // 2) Disparar el evento correcto de Inngest (INMEDIATO)
    const tSend = Date.now();
    let sendResult: unknown;

    if (isAudio || isVideo) {
      sendResult = await inngest.send({ name: 'task/transcribe', data: { jobId } });
      // Estado optimista permitido por tu tipo:
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
    } else {
      sendResult = await inngest.send({
        name: 'task/process-document',
        data: { jobId, documentUrl: url, filename, actions, language, summaryType }
      });
      await TranscriptionJobDB.updateStatus(jobId, 'processing');
    }

    console.log('[queue] job created + event sent', {
      jobId,
      mime,
      t_create_ms: tSend - tCreate,
      t_send_ms: Date.now() - tSend,
      sendResult
    });

    return NextResponse.json({
      success: true,
      message: 'Job creado y encolado',
      data: { jobId, mime, queuedAt: new Date().toISOString() }
    }, { status: 201 });

  } catch (e: any) {
    console.error('[queue] error', e?.message || e);
    return NextResponse.json({ success:false, message:e?.message || 'Error encolar job' }, { status:500 });
  }
}
