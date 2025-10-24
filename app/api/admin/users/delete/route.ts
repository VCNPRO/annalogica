import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * DELETE /api/admin/users/delete
 * Eliminar un usuario y todos sus datos relacionados
 * PRECAUCIÓN: Esta acción es irreversible
 */
export async function DELETE(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    console.log(`[Admin] Iniciando eliminación de usuario: ${userId}`);

    // Verificar que el usuario existe
    const userCheck = await sql`
      SELECT id, email FROM users WHERE id = ${userId}
    `;

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userEmail = userCheck.rows[0].email;

    // Eliminar en orden (respetar foreign keys)

    // 1. Eliminar jobs de transcripción
    const jobsDeleted = await sql`
      DELETE FROM transcription_jobs
      WHERE user_id = ${userId}
    `;
    console.log(`[Admin] Eliminados ${jobsDeleted.rowCount} transcription_jobs`);

    // 2. Eliminar transcripciones (si existen)
    const transcriptionsDeleted = await sql`
      DELETE FROM transcriptions
      WHERE user_id = ${userId}
    `;
    console.log(`[Admin] Eliminados ${transcriptionsDeleted.rowCount} transcriptions`);

    // 3. Eliminar alertas del sistema relacionadas con el usuario (si existen)
    try {
      const alertsDeleted = await sql`
        DELETE FROM system_alerts
        WHERE user_id = ${userId}
      `;
      console.log(`[Admin] Eliminadas ${alertsDeleted.rowCount} system_alerts`);
    } catch (error) {
      // Tabla puede no existir, continuar
      console.log('[Admin] system_alerts table not found, skipping');
    }

    // 4. Finalmente, eliminar el usuario
    const userDeleted = await sql`
      DELETE FROM users
      WHERE id = ${userId}
    `;

    if (userDeleted.rowCount === 0) {
      return NextResponse.json(
        { error: 'Error al eliminar usuario' },
        { status: 500 }
      );
    }

    console.log(`[Admin] Usuario ${userEmail} (${userId}) eliminado correctamente`);

    return NextResponse.json({
      success: true,
      message: `Usuario ${userEmail} eliminado correctamente`,
      deletedRecords: {
        transcriptionJobs: jobsDeleted.rowCount,
        transcriptions: transcriptionsDeleted.rowCount,
        user: 1
      }
    });

  } catch (error: any) {
    console.error('[Admin] Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario: ' + error.message },
      { status: 500 }
    );
  }
}
