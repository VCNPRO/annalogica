import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * GET /api/modules
 * Obtener módulos disponibles para el usuario autenticado.
 * Si es admin, devuelve todos los service_modules.
 * Si es usuario regular, devuelve solo los módulos asignados vía user_modules.
 */
export async function GET(request: Request) {
  try {
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar role del usuario
    const userResult = await sql`SELECT role FROM users WHERE id = ${auth.userId}`;
    const role = userResult.rows[0]?.role;

    if (role === 'admin') {
      // Admin: devolver todos los módulos activos
      const result = await sql`
        SELECT id, name, description, monthly_price, is_active
        FROM service_modules
        ORDER BY name
      `;
      return NextResponse.json({ modules: result.rows });
    }

    // Usuario regular: devolver solo módulos asignados y activos
    const result = await sql`
      SELECT sm.id, sm.name, sm.description, sm.monthly_price, sm.is_active,
             um.active as user_active, um.granted_at, um.expires_at
      FROM user_modules um
      JOIN service_modules sm ON sm.id = um.module_id
      WHERE um.user_id = ${auth.userId}
        AND um.active = true
        AND (um.expires_at IS NULL OR um.expires_at > NOW())
      ORDER BY sm.name
    `;

    return NextResponse.json({ modules: result.rows });
  } catch (error: any) {
    console.error('Error getting modules:', error);
    return NextResponse.json(
      { error: 'Error al obtener módulos' },
      { status: 500 }
    );
  }
}
