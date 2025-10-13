import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { logAdminAction } from '@/lib/admin-logs';
import { logger } from '@/lib/logger';

export async function POST(
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

    // 3. Verificar que el usuario existe
    const userResult = await sql`
      SELECT id, email, monthly_usage, monthly_quota FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const oldUsage = user.monthly_usage;

    // 4. Resetear uso mensual
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await sql`
      UPDATE users
      SET
        monthly_usage = 0,
        quota_reset_date = ${nextMonth.toISOString()},
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    // 5. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'reset_quota',
      targetUserId: userId,
      details: {
        target_email: user.email,
        old_usage: oldUsage,
        old_quota: user.monthly_quota,
        new_usage: 0,
        new_reset_date: nextMonth.toISOString(),
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('Quota reset by admin', {
      adminId: auth.userId,
      targetUserId: userId,
      targetEmail: user.email,
      oldUsage,
    });

    return NextResponse.json({
      success: true,
      message: 'Cuota reseteada correctamente',
      data: {
        old_usage: oldUsage,
        new_usage: 0,
        quota: user.monthly_quota,
        reset_date: nextMonth.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error resetting quota', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
