// app/api/admin/export/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

export const runtime = 'nodejs';

// --- AUTH placeholders (cámbialos por tu auth real) ---
async function auth() { return { user: { id: 'admin-placeholder' } }; }
async function getUserIsAdmin(userId: string) { return Boolean(userId); }

// --- CSV helpers (escape + mitigación CSV injection) ---
function mitigateCsvInjection(s: string): string {
  if (!s) return s;
  const c = s[0];
  return (c === '=' || c === '+' || c === '-' || c === '@' || c === '\t') ? `'` + s : s;
}
function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  s = mitigateCsvInjection(s);
  return (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) ? `"${s.replace(/"/g, '""')}"` : s;
}
function rowsToCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const head = headers.join(',');
  const body = rows.map(r => headers.map(h => escapeCsvCell((r as any)[h])).join(',')).join('\n');
  return `${head}\n${body}`;
}

// --- DB env presence (mensaje claro si falta) ---
function getDbUrlPresence() {
  const keys = ['POSTGRES_URL','POSTGRES_URL_NON_POOLING','DATABASE_URL','DB_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NO_SSL'];
  const presence = Object.fromEntries(keys.map(k => [k, process.env[k] ? 'SET' : 'MISSING'])) as Record<string,'SET'|'MISSING'>;
  return { presence, anySet: Object.values(presence).includes('SET') };
}

export async function GET() {
  noStore();

  // 1) Auth admin
  const session = await auth();
  if (!session?.user?.id) return new Response('No autorizado', { status: 401 });
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) return new Response('Acceso denegado', { status: 403 });

  // 2) Comprobar variables BD
  const { presence, anySet } = getDbUrlPresence();
  if (!anySet) {
    console.error('[admin/export] Missing DB env:', presence);
    return NextResponse.json({ error: 'BD no configurada', details: presence }, { status: 500 });
  }

  try {
    // 3) Ping de conectividad
    await sql`SELECT 1`;

    // 4) Consulta MINIMAL sin WHERE y sin JOIN (evita el error $1)
    const res = await sql`
      SELECT 
        t.id,
        t.filename,
        t.status,
        t.created_at,
        t.audio_duration,
        t.total_cost_usd,
        t.metadata->>'error' AS error_message
      FROM transcription_jobs t
      ORDER BY t.created_at DESC
      LIMIT 100;
    `;
    const rows = res.rows;

    // 5) CSV
    const csv = rowsToCsv(rows);
    const out = '\uFEFF' + csv; // BOM para Excel

    // 6) Respuesta
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="annalogica_export_${yyyy}-${mm}-${dd}.csv"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new Response(out, { status: 200, headers });
  } catch (error: any) {
    console.error('[admin/export] Error al generar el CSV (hotfix):', { message: error?.message, code: error?.code, stack: error?.stack });
    return NextResponse.json({ error: 'Error interno del servidor al generar el CSV' }, { status: 500 });
  }
}
