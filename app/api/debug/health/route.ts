import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyRequestAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/health
 * Endpoint de diagnóstico para verificar componentes del sistema
 */
export async function GET(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // 1. Test de Autenticación
    try {
      const user = verifyRequestAuth(request);
      results.checks.auth = {
        status: user ? 'ok' : 'no_user',
        userId: user?.userId,
        email: user?.email
      };
    } catch (error: any) {
      results.checks.auth = {
        status: 'error',
        error: error.message
      };
    }

    // 2. Test de Base de Datos
    try {
      const dbTest = await sql`SELECT 1 as test`;
      results.checks.database = {
        status: 'ok',
        result: dbTest.rows[0]
      };
    } catch (error: any) {
      results.checks.database = {
        status: 'error',
        error: error.message
      };
    }

    // 3. Test de Tabla transcription_jobs
    try {
      const tableCheck = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'transcription_jobs'
        ORDER BY ordinal_position
      `;
      results.checks.transcription_jobs_table = {
        status: 'ok',
        columns: tableCheck.rows.length,
        has_tags_column: tableCheck.rows.some(r => r.column_name === 'tags')
      };
    } catch (error: any) {
      results.checks.transcription_jobs_table = {
        status: 'error',
        error: error.message
      };
    }

    // 4. Test de Variables de Entorno
    results.checks.env_vars = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
      INNGEST_EVENT_KEY: !!process.env.INNGEST_EVENT_KEY,
      INNGEST_SIGNING_KEY: !!process.env.INNGEST_SIGNING_KEY,
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
    };

    // 5. Test de TranscriptionJobDB
    try {
      const { TranscriptionJobDB } = await import('@/lib/db');
      results.checks.transcription_job_db = {
        status: 'ok',
        imported: true
      };
    } catch (error: any) {
      results.checks.transcription_job_db = {
        status: 'error',
        error: error.message
      };
    }

    // 6. Test de checkSeparateQuotas (si hay usuario)
    if (results.checks.auth?.userId) {
      try {
        const { checkSeparateQuotas } = await import('@/lib/subscription-guard-v2');
        const quotaStatus = await checkSeparateQuotas(results.checks.auth.userId);
        results.checks.quotas = {
          status: 'ok',
          canUploadAudio: quotaStatus.canUploadAudio,
          usageAudioMinutes: quotaStatus.usageAudioMinutes,
          quotaAudioMinutes: quotaStatus.quotaAudioMinutes
        };
      } catch (error: any) {
        results.checks.quotas = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Determinar status general
    const hasErrors = Object.values(results.checks).some(
      (check: any) => check.status === 'error'
    );
    results.overall = hasErrors ? 'unhealthy' : 'healthy';

    return NextResponse.json(results, { status: hasErrors ? 500 : 200 });
  } catch (error: any) {
    return NextResponse.json({
      overall: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
