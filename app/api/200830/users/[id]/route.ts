import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { logAdminAction } from '@/lib/admin-logs';
import { logger } from '@/lib/logger';

// GET - Obtener detalles de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Verificar permisos de admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado: se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // 3. Obtener datos del usuario
    const userResult = await sql`
      SELECT
        id,
        email,
        name,
        role,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_plan,
        subscription_status,
        subscription_start_date,
        subscription_end_date,
        subscription_cancel_at_period_end,
        monthly_quota,
        monthly_usage,
        quota_reset_date,
        created_at,
        updated_at
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 4. Obtener estadísticas del usuario
    const statsResult = await sql`
      SELECT
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        SUM(audio_duration_seconds) / 60 as total_minutes,
        MAX(created_at) as last_activity
      FROM transcription_jobs
      WHERE user_id = ${userId}
    `;

    const stats = statsResult.rows[0];

    // 5. Registrar vista en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'view_user_details',
      targetUserId: userId,
      details: {
        target_email: user.email,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: {
          total_jobs: parseInt(stats.total_jobs) || 0,
          completed_jobs: parseInt(stats.completed_jobs) || 0,
          failed_jobs: parseInt(stats.failed_jobs) || 0,
          total_minutes: parseFloat(stats.total_minutes) || 0,
          last_activity: stats.last_activity,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error getting user details', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Verificar permisos de admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado: se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // 3. No permitir que un admin se elimine a sí mismo
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    // 4. Verificar que el usuario existe
    const userResult = await sql`
      SELECT id, email, role FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 5. Eliminar jobs del usuario primero
    const jobsDeleted = await sql`
      DELETE FROM transcription_jobs WHERE user_id = ${userId}
      RETURNING id
    `;

    // 6. Eliminar usuario
    await sql`
      DELETE FROM users WHERE id = ${userId}
    `;

    // 7. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'delete_user',
      targetUserId: userId,
      details: {
        target_email: user.email,
        target_role: user.role,
        jobs_deleted: jobsDeleted.rows.length,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('User deleted by admin', {
      adminId: auth.userId,
      targetUserId: userId,
      targetEmail: user.email,
      jobsDeleted: jobsDeleted.rows.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
      data: {
        deleted_user_id: userId,
        deleted_jobs: jobsDeleted.rows.length,
      },
    });
  } catch (error: any) {
    logger.error('Error deleting user', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const auth = verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Verificar permisos de admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado: se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // 3. Obtener datos del body
    const { email, name, role } = await request.json();

    if (!email && !name && !role) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // 4. Verificar que el usuario existe
    const userResult = await sql`
      SELECT id, email, name, role FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const oldUser = userResult.rows[0];

    // 5. Construir query de actualización
    const updates: string[] = [];
    const values: any[] = [];

    if (email && email !== oldUser.email) {
      values.push(email.toLowerCase());
      updates.push(`email = $${values.length}`);
    }

    if (name !== undefined && name !== oldUser.name) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (role && role !== oldUser.role) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json(
          { error: 'Role inválido. Debe ser "user" o "admin"' },
          { status: 400 }
        );
      }
      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay cambios para aplicar',
      });
    }

    values.push('NOW()');
    updates.push(`updated_at = $${values.length}`);

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, email, name, role, updated_at
    `;

    const updateResult = await sql.query(query, values);
    const updatedUser = updateResult.rows[0];

    // 6. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'update_user',
      targetUserId: userId,
      details: {
        old_email: oldUser.email,
        new_email: email || oldUser.email,
        old_name: oldUser.name,
        new_name: name !== undefined ? name : oldUser.name,
        old_role: oldUser.role,
        new_role: role || oldUser.role,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('User updated by admin', {
      adminId: auth.userId,
      targetUserId: userId,
      changes: { email, name, role },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      user: updatedUser,
    });
  } catch (error: any) {
    logger.error('Error updating user', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
