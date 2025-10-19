import { NextResponse } from 'next/server';

/**
 * Devuelve la versión actual del despliegue.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok', // Indica que la API está funcionando
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  });
}
