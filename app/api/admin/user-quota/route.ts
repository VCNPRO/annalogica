import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * PATCH /api/admin/user-quota
 * Actualizar cuota mensual de un usuario (para beta testers)
 */
export async function PATCH(request: Request) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, monthlyQuota } = body;

    if (!userId || monthlyQuota === undefined) {
      return NextResponse.json(
        { error: 'userId y monthlyQuota son requeridos' },
        { status: 400 }
      );
    }

    // Validar que monthlyQuota sea un número positivo
    const quota = parseInt(monthlyQuota);
    if (isNaN(quota) || quota < 0) {
      return NextResponse.json(
        { error: 'monthlyQuota debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Actualizar cuota
    await sql`
      UPDATE users
      SET monthly_quota = ${quota},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`[Admin] Updated quota for user ${userId}: ${quota}`);

    return NextResponse.json({
      success: true,
      userId,
      monthlyQuota: quota
    });
  } catch (error: any) {
    console.error('Error updating user quota:', error);
    return NextResponse.json(
      { error: 'Error al actualizar cuota' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/user-quota/reset
 * Resetear uso mensual de un usuario
 */
export async function POST(request: Request) {
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

    // Resetear uso mensual
    await sql`
      UPDATE users
      SET monthly_usage = 0,
          quota_reset_date = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`[Admin] Reset monthly usage for user ${userId}`);

    return NextResponse.json({
      success: true,
      userId
    });
  } catch (error: any) {
    console.error('Error resetting user usage:', error);
    return NextResponse.json(
      { error: 'Error al resetear uso' },
      { status: 500 }
    );
  }
}
