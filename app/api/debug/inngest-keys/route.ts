import { NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Verificar keys de Inngest
 * Muestra primeros/últimos caracteres para verificar sin exponer la key completa
 * ELIMINAR DESPUÉS DE DEBUGGEAR
 */
export async function GET() {
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const eventKey = process.env.INNGEST_EVENT_KEY;

  return NextResponse.json({
    signingKey: {
      exists: !!signingKey,
      length: signingKey?.length || 0,
      prefix: signingKey?.substring(0, 20) || 'N/A', // Primeros 20 caracteres
      suffix: signingKey?.substring(signingKey.length - 10) || 'N/A', // Últimos 10
      hasSpaces: signingKey?.includes(' ') || false,
      startsCorrectly: signingKey?.startsWith('signkey-prod-') || false
    },
    eventKey: {
      exists: !!eventKey,
      length: eventKey?.length || 0,
      prefix: eventKey?.substring(0, 15) || 'N/A',
      suffix: eventKey?.substring(eventKey.length - 8) || 'N/A',
      hasSpaces: eventKey?.includes(' ') || false
    },
    environment: process.env.VERCEL_ENV || 'local'
  });
}
