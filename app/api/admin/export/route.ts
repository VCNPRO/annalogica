// app/api/admin/export/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

export const runtime = 'nodejs';

// ---- AUTH PLACEHOLDER (ajusta a tu sistema real) ----
async function auth() { return { user: { id: 'admin-placeholder' } }; }
async function getUserIsAdmin(userId: string) { return Boolean(userId); }

// ---- CSV helpers (escape + mitigación CSV injection) ----
function mitigateCsvInjection(s: string): string {
  if (!s) return s;
  const first = s[0];
  return (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t') ? `'` + s : s;
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

// ---- Util para detectar si falta config de BD ----
function getDbUrlPresence() {
  const candidates = [
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL',
    'DB_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NO_SSL',
  ];
  const presence: Record<string, 'SET' | 'MISSING'> = {};
  for (const k of candidates) presence[k] = process.env[k] ? 'SET' : 'MISSING';
  const anySet = Object.values(presence).includes('SET');
  return { anySet, presence };
}

export async function GET(request: Request) {
  noStore();

  // 1) Auth admin
  const session = await auth();
  if (!session?.user?.id) return new Response('No autorizado', { status: 401 });
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) return new Response('Acceso denegado', { status: 403 });

  // 2) Variables de entorno de BD
  const { anySet, presence } = getDbUrlPresence();
  if (!anySet) {
    console.error('[admin/export] No DB env set:', presence);
    return NextResponse.json(
      { error: 'BD no configurada. Faltan variables de conexión', details: presence },
      { status: 500 }
    );
  }

  // 3) Filtros
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const from = url.searchParams.get('from') || undefined; // YYYY-MM-DD
  const to   = url.searchParams.get('to')   || undefined; // YYYY-MM-DD
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 5000), 1), 10000);

  try {
    // 4) Ping de conectividad
    await sql`SELECT 1 as ok`;

    // 5) Construir condiciones
    const conds: any[] = [];
    if (status) conds.push(sql`t.status = ${status}`);
    if (from)   conds.push(sql`t.created_at >= ${from}`);
    if (to)     conds.push(sql`t.created_at <= ${to}`);
    const whereClause = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;

    // 6) Intento 1: con LEFT JOIN users (si existe)
    const baseQuery = sql`
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
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limit};
    `;

    let rows: any[] = [];
    try {
      const r = await baseQuery;
      rows = r.rows;
    } catch (err: any) {
      // Tabla/columna inexistente → reintentar sin users
      const code = err?.code || err?.errno || err?.name;
      console.error('[admin/export] Query attempt 1 failed:', { code, message: err?.message });
      // 42P01 = undefined_table, 42703 = undefined_column (Postgres)
      if (code === '42P01' || code === '42703' || /undefined_table|relation .* does not exist/i.test(err?.message)) {
        const fallback = await sql`
          SELECT
            t.id,
            t.filename,
            t.status,
            t.created_at,
            t.audio_duration,
            t.total_cost_usd,
            t.metadata->>'error' AS error_message
          FROM transcription_jobs t
          ${whereClause}
          ORDER BY t.created_at DESC
          LIMIT ${limit};
        `;
        rows = fallback.rows;
      } else {
        throw err; // otro tipo de error → propagar
      }
    }

    // 7) CSV
    const csv = rowsToCsv(rows);
    const BOM = '\uFEFF';
    const out = BOM + csv;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="annalogica_export_${yyyy}-${mm}-${dd}.csv"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return new Response(out, { status: 200, headers });
  } catch (error: any) {
    console.error('[admin/export] Error al generar el CSV:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el CSV' },
      { status: 500 }
    );
  }
}
