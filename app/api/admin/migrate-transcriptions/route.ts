// API para aplicar migración de columnas en transcriptions
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyRequestAuth } from '@/lib/auth';

export const maxDuration = 60; // 1 minuto

/**
 * POST /api/admin/migrate-transcriptions
 * Agrega columnas faltantes a la tabla transcriptions
 * SOLO ADMIN
 */
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin
    const userResult = await sql`SELECT role FROM users WHERE id = ${auth.userId}`;
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado - Se requiere rol de admin' }, { status: 403 });
    }

    console.log('[migrate-transcriptions] Iniciando migración...');

    const results: any[] = [];

    // 1. language
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'auto'`;
      results.push({ column: 'language', status: 'success' });
      console.log('[migrate-transcriptions] ✅ language');
    } catch (e: any) {
      results.push({ column: 'language', status: 'error', error: e.message });
    }

    // 2. vtt_url
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS vtt_url TEXT`;
      results.push({ column: 'vtt_url', status: 'success' });
      console.log('[migrate-transcriptions] ✅ vtt_url');
    } catch (e: any) {
      results.push({ column: 'vtt_url', status: 'error', error: e.message });
    }

    // 3. speakers_url
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS speakers_url TEXT`;
      results.push({ column: 'speakers_url', status: 'success' });
      console.log('[migrate-transcriptions] ✅ speakers_url');
    } catch (e: any) {
      results.push({ column: 'speakers_url', status: 'error', error: e.message });
    }

    // 4. tags
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS tags JSONB`;
      results.push({ column: 'tags', status: 'success' });
      console.log('[migrate-transcriptions] ✅ tags');
    } catch (e: any) {
      results.push({ column: 'tags', status: 'error', error: e.message });
    }

    // 5. audio_duration_seconds
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER`;
      results.push({ column: 'audio_duration_seconds', status: 'success' });
      console.log('[migrate-transcriptions] ✅ audio_duration_seconds');
    } catch (e: any) {
      results.push({ column: 'audio_duration_seconds', status: 'error', error: e.message });
    }

    // 6. metadata
    try {
      await sql`ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS metadata JSONB`;
      results.push({ column: 'metadata', status: 'success' });
      console.log('[migrate-transcriptions] ✅ metadata');
    } catch (e: any) {
      results.push({ column: 'metadata', status: 'error', error: e.message });
    }

    // Verificar columnas actuales
    const columnsResult = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `;

    console.log('[migrate-transcriptions] Migración completada');

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      results,
      currentColumns: columnsResult.rows
    });

  } catch (error: any) {
    console.error('[migrate-transcriptions] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
