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

export async function GET(request: Request) {
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

  // 3) Filtros (permiten null)
  const url = new URL(request.url);
  const status = url.searchParams.get('status');           // string | null
  const from   = url.searchParams.get('from');             // YYYY-MM-DD | null
  const to     = url.searchParams.get('to');               // YYYY-MM-DD | null
  const limitQ = Number(url.searchParams.get('limit') || 5000);
  const limit  = Math.min(Math.max(limitQ, 1), 10000);

  try {
    // 4) Ping de conectividad
    await sql`SELECT 1`;

    // 5) Consulta con WHERE parametrizado SIEMPRE VÁLIDO
    // (${status}::text IS NULL OR t.status = ${status})
    // (${from}::timestamptz IS NULL OR t.created_at >= ${from})
    // (${to}::timestamptz IS NULL OR t.created_at <= ${to})
    let rows: any[] = [];
    try {
      const r = await sql`
        SELECT 
          t.id,
          u.email        AS user_email,
          t.filename,
          t.status,
          t.created_at,
          t.audio_duration,
          t.total_cost_usd,
          t.metadata->>'error' AS error_message
        FROM transcription_jobs t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE (${status}::text IS NULL OR t.status = ${status})
          AND (${from}::timestamptz IS NULL OR t.created_at >= ${from})
          AND (${to}::timestamptz IS NULL OR t.created_at <= ${to})
        ORDER BY t.created_at DESC
        LIMIT ${limit};
      `;
      rows = r.rows;
    } catch (e: any) {
      // Si falla por tabla/columna de users inexistente, reintenta sin JOIN
      const code = e?.code;
      console.error('[admin/export] Attempt with users join failed:', { code, message: e?.message });
      const fb = await sql`
        SELECT 
          t.id,
          t.filename,
          t.status,
          t.created_at,
          t.audio_duration,
          t.total_cost_usd,
          t.metadata->>'error' AS error_message
        FROM transcription_jobs t
        WHERE (${status}::text IS NULL OR t.status = ${status})
          AND (${from}::timestamptz IS NULL OR t.created_at >= ${from})
          AND (${to}::timestamptz IS NULL OR t.created_at <= ${to})
        ORDER BY t.created_at DESC
        LIMIT ${limit};
      `;
      rows = fb.rows;
    }

    // 6) CSV
    const csv = rowsToCsv(rows);
    const out = '\uFEFF' + csv; // BOM para Excel

    // 7) Respuesta
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
    console.error('[admin/export] Error al generar el CSV:', { message: error?.message, code: error?.code, stack: error?.stack });
    return NextResponse.json({ error: 'Error interno del servidor al generar el CSV' }, { status: 500 });
  }
}
