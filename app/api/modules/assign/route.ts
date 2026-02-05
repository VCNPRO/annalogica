import { NextResponse } from 'next/server';
import { verifyAdmin, verifyRequestAuth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * POST /api/modules/assign
 * Asignar un módulo a un usuario
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const auth = verifyRequestAuth(request);
    const adminUserId = auth?.userId || null;

    const body = await request.json();
    const { userId, moduleId } = body;

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: 'userId y moduleId son requeridos' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO user_modules (user_id, module_id, active, granted_by)
      VALUES (${userId}, ${moduleId}, true, ${adminUserId})
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET active = true, granted_by = ${adminUserId}, granted_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: `Módulo ${moduleId} asignado al usuario ${userId}`
    });
  } catch (error: any) {
    console.error('Error assigning module:', error);
    return NextResponse.json(
      { error: 'Error al asignar módulo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modules/assign
 * Revocar un módulo de un usuario
 */
export async function DELETE(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, moduleId } = body;

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: 'userId y moduleId son requeridos' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM user_modules
      WHERE user_id = ${userId} AND module_id = ${moduleId}
    `;

    return NextResponse.json({
      success: true,
      message: `Módulo ${moduleId} revocado del usuario ${userId}`
    });
  } catch (error: any) {
    console.error('Error removing module:', error);
    return NextResponse.json(
      { error: 'Error al revocar módulo', details: error.message },
      { status: 500 }
    );
  }
}
