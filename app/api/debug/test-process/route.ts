// Endpoint de debugging para probar el procesamiento
import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export const maxDuration = 60;

/**
 * POST /api/debug/test-process
 * Prueba el procesamiento con mejor manejo de errores
 */
export async function POST(request: Request) {
  try {
    console.log('[DEBUG] Starting test-process...');

    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { audioUrl, filename, language = 'auto' } = body;

    console.log('[DEBUG] Request params:', { audioUrl: audioUrl?.substring(0, 50), filename, language });

    // Intentar crear job
    console.log('[DEBUG] Creating job...');
    try {
      const job = await TranscriptionJobDB.create(
        auth.userId,
        filename,
        audioUrl,
        language
      );

      console.log('[DEBUG] Job created:', job.id);

      return NextResponse.json({
        success: true,
        message: 'Job creado exitosamente',
        jobId: job.id,
        debug: {
          userId: auth.userId,
          filename,
          audioUrl: audioUrl?.substring(0, 50) + '...',
          language
        }
      });

    } catch (dbError: any) {
      console.error('[DEBUG] Database error:', dbError);

      return NextResponse.json({
        success: false,
        error: 'Error en base de datos',
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        stack: dbError.stack?.split('\n').slice(0, 5)
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[DEBUG] General error:', error);

    return NextResponse.json({
      success: false,
      error: 'Error general',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}
