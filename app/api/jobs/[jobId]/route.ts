// DÓNDE: app/api/jobs/[jobId]/route.ts
// VERSIÓN ROBUSTA: Soluciona el error 500 y comunica el estado real de los trabajos.

import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { unstable_noStore as noStore } from 'next/cache';

export async function GET(request: NextRequest, context: { params: { jobId: string } }) {
  noStore(); // Asegura que siempre obtenemos el estado más reciente del trabajo

  try {
    // 1. Verificar autenticación (se mantiene igual)
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { jobId } = context.params;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 });
    }

    // 2. Obtener el trabajo de la base de datos (se mantiene igual)
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job || job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Trabajo no encontrado o no autorizado' }, { status: 404 });
    }

    // --- ¡AQUÍ ESTÁ LA MEJORA CLAVE! ---
    // 3. Construir una respuesta segura y predecible, en lugar de devolver el objeto de la BD directamente.
    
    const safeJobResponse = {
      id: job.id,
      status: job.status,
      filename: job.filename,
      created_at: job.created_at,
      
      // Incluimos las URLs solo si existen, para no enviar 'null' al frontend
      txtUrl: job.txt_url || undefined,
      srtUrl: job.srt_url || undefined,
      vttUrl: job.vtt_url || undefined,
      summaryUrl: job.summary_url || undefined,
      
      // Extraemos el mensaje de error de los metadatos para que sea fácil de mostrar
      error: job.metadata?.error || null,

      // También pasamos los metadatos completos por si el frontend los necesita
      metadata: job.metadata,
    };

    return NextResponse.json({ job: safeJobResponse });

  } catch (error: any) {
    console.error(`[API Job Getter /api/jobs/${context.params.jobId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Error interno al obtener el estado del trabajo' }, { status: 500 });
  }
}
