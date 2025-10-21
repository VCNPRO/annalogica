// DÓNDE: app/api/jobs/[jobId]/route.ts
// VERSIÓN CORREGIDA Y COMENTADA

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { unstable_noStore as noStore } from 'next/cache';

// --- FIRMA DE FUNCIÓN ROBUSTA ---
// Si no usas TypeScript estricto, `context: any` está bien.
// Pero si sí, mejor usar: { params: { jobId: string } }
export async function GET(
  request: NextRequest,
  context: { params: { jobId?: string } } // <-- Tipado más preciso
) {
  noStore(); // Evita la caché y fuerza obtener el estado más reciente

  try {
    // 1. Verificar autenticación
    const user = await verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener el parámetro dinámico jobId
    const jobId = context.params?.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
    }

    // 3. Buscar el trabajo en la base de datos
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job || job.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Trabajo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // 4. Respuesta segura (evita exponer campos sensibles)
    const safeJobResponse = {
      id: job.id,
      status: job.status,
      filename: job.filename,
      created_at: job.created_at,

      txtUrl: job.txt_url || undefined,
      srtUrl: job.srt_url || undefined,
      vttUrl: job.vtt_url || undefined,
      summaryUrl: job.summary_url || undefined,

      error: job.metadata?.error || null,
      metadata: job.metadata,
    };

    return NextResponse.json({ job: safeJobResponse });
  } catch (error: unknown) {
    console.error(
      `[API Job Getter /api/jobs/${context.params?.jobId ?? 'unknown'}] Error:`,
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Error interno al obtener el estado del trabajo';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
