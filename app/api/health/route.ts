import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Health check endpoint para monitoreo
 * GET /api/health
 *
 * Verifica:
 * - Servidor funcionando
 * - Conexión a base de datos
 * - Variables de entorno críticas
 */
export async function GET() {
  const checks = {
    server: 'ok',
    database: 'unknown',
    env: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    await sql`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    console.error('[HEALTH] Database check failed:', error);
  }

  // Check critical environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'POSTGRES_URL',
    'BLOB_READ_WRITE_TOKEN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'OPENAI_API_KEY',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length === 0) {
    checks.env = 'ok';
  } else {
    checks.env = 'error';
    console.error('[HEALTH] Missing environment variables:', missingEnvVars);
  }

  // Determine overall status
  const isHealthy = checks.database === 'ok' && checks.env === 'ok';
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks
    },
    { status: statusCode }
  );
}
