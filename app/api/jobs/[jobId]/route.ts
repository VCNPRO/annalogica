// DÓNDE: app/api/jobs/[jobId]/route.ts
// VERSIÓN CORREGIDA: Se ajusta la firma de la función GET a la sintaxis alternativa de Next.js.

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { unstable_noStore as noStore } from 'next/cache';

// --- FIRMA DE LA FUNCIÓN CORREGIDA (VERSIÓN ALTERNATIVA) ---
// Cambiamos 'context' por la desestructuración directa '{ params }'
export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  noStore(); // Asegura que siempre obtenemos el estado más reciente del trabajo

  try {
    // 1. Verificar autenticación (se mantiene igual)
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // --- LÍNEA CORREGIDA ---
    // Ahora usamos 'params' directamente en lugar de 'context.params'
    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
    }

    // 2. Obtener el trabajo de la base de datos (se mantiene igual)
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job || job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Trabajo no encontrado o no autorizado' }, { status: 404 });
    }

    // 3. Construir una respuesta segura (se mantiene igual)
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

  } catch (error: any) {
    // --- LÍNEA CORREGIDA ---
    // Usamos 'params.jobId' para el log de error
    console.error(`[API Job Getter /api/jobs/${params.jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error interno al obtener el estado del trabajo' }, { status: 500 });
  }
}

