// DÓNDE: app/api/admin/export/route.ts
// MISIÓN: Recoger datos de la base de datos, convertirlos a CSV y servirlos como un archivo descargable.

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

// Si necesitas forzar runtime Node (recomendado si usas @vercel/postgres en App Router):
export const runtime = 'nodejs';

// ============================================================================
// AUTH: Sustituye estas funciones por tu sistema real (next-auth, JWT, etc.)
// ============================================================================
async function auth() {
  // TODO: reemplaza por tu auth real
  return { user: { id: 'd4f39938-7756-4f83-82f0-feb7dfd498d0' } };
}
async function getUserIsAdmin(userId: string) {
  // TODO: reemplaza por tu check real
  return Boolean(userId);
}

// ============================================================================
// Utilidades CSV
// ============================================================================
/**
 * Evita fórmulas maliciosas si se abre en Excel/Sheets (CSV Injection).
 * Si un valor comienza por = + - @ o tab, lo prefijamos con ' (apóstrofo).
 */
function mitigateCsvInjection(s: string): string {
  if (!s) return s;
  const first = s.charAt(0);
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t') {
    return `'` + s;
  }
  return s;
}

/**
 * Escapa una celda CSV: comillas, comas y saltos de línea.
 * También aplica mitigación de CSV injection.
 */
function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);

  // Normaliza fechas a ISO si parecen Date string
  // (opcional: deja tal cual si ya viene del SQL formateado)
  // Aquí dejamos s tal cual para evitar sorpresas.

  // Mitigación de CSV injection
  s = mitigateCsvInjection(s);

  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convierte un array de objetos homogéneos a CSV (con cabeceras).
 */
function arrayToCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');

  const lines = rows.map((row) => {
    const cells = headers.map((h) => escapeCsvCell(row[h]));
    return cells.join(',');
  });

  return [headerLine, ...lines].join('\n');
}

// ============================================================================
// Handler
// ============================================================================
export async function GET(request: Request) {
  noStore();

  // 1) Autenticación / Autorización (admin)
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 });
  }
  const isAdmin = await getUserIsAdmin(session.user.id);
  if (!isAdmin) {
    return new Response('Acceso denegado', { status: 403 });
  }

  // 2) Parseo de filtros opcionales
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined; // p.ej. "completed" | "failed" | ...
  const from = url.searchParams.get('from') || undefined;     // p.ej. "2025-01-01"
  const to = url.searchParams.get('to') || undefined;         // p.ej. "2025-12-31"
  const limitParam = url.searchParams.get('limit');
  // Límite seguro por defecto (evita exports gigantes inadvertidos)
  const limit = Math.min(Math.max(Number(limitParam || 5000), 1), 10000);

  try {
    // 3) Construcción segura del WHERE dinámico
    // Con @vercel/postgres, usa fragmentos sql`` y sql.join para condiciones.
    const conds: any[] = [];

    if (status) {
      conds.push(sql`t.status = ${status}`);
    }
    if (from) {
      // Asumimos ISO-8601; la BD hará el parse si el campo es timestamptz
      conds.push(sql`t.created_at >= ${from}`);
    }
    if (to) {
      // nota: si quieres inclusivo, puedes sumar 1 día a 'to'
      conds.push(sql`t.created_at <= ${to}`);
    }

    const whereClause = conds.length > 0 ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;

    // 4) Consulta principal
    // Ajusta nombres de tablas/columnas según tu esquema real.
    const query = sql`
      SELECT 
        t.id,
        u.email        AS user_email,
        t.filename,
        t.status,
        t.created_at,          -- timestamptz
        t.audio_duration,
        t.total_cost_usd,
        t.metadata->>'error'   AS error_message
      FROM transcription_jobs t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limit};
    `;

    // Ejecuta y recoge filas
    const { rows } = await query;

    // 5) Conversión a CSV (añadimos BOM para compatibilidad con Excel en Windows)
    const csv = arrayToCsv(rows);
    const BOM = '\uFEFF'; // Byte Order Mark (UTF-8)
    const csvWithBom = BOM + csv;

    // 6) Nombre de archivo: fecha local (Europa/Madrid)
    // Evitamos dependencias externas: usamos la TZ del sistema del server;
    // si quieres forzar ES, podrías formatear con toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `annalogica_export_${yyyy}-${mm}-${dd}.csv`;

    // 7) Cabeceras de respuesta
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new Response(csvWithBom, { status: 200, headers });
  } catch (error) {
    console.error('[admin/export] Error al generar el CSV:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el CSV' },
      { status: 500 }
    );
  }
}
