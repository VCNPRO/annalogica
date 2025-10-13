import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, verifyAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { logAdminAction } from '@/lib/admin-logs';
import { logger } from '@/lib/logger';
import { getQuotaForPlan } from '@/lib/stripe/client';

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

    // 3. Obtener datos del body
    const { plan, status, trialDays } = await request.json();

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan es requerido' },
        { status: 400 }
      );
    }

    const validPlans = ['free', 'basico', 'pro', 'business', 'universidad', 'medios', 'empresarial'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Plan inválido. Debe ser uno de: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Verificar que el usuario existe
    const userResult = await sql`
      SELECT
        id,
        email,
        subscription_plan,
        subscription_status,
        monthly_quota
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
    const oldPlan = user.subscription_plan;
    const oldStatus = user.subscription_status;
    const oldQuota = user.monthly_quota;

    // 5. Obtener cuota del nuevo plan
    const newQuota = getQuotaForPlan(plan);

    // 6. Calcular fechas
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let subscriptionStatus = status || 'active';
    let subscriptionEndDate = null;

    if (trialDays && trialDays > 0) {
      subscriptionStatus = 'trialing';
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + trialDays);
      subscriptionEndDate = endDate;
    }

    // 7. Actualizar plan en BD
    await sql`
      UPDATE users
      SET
        subscription_plan = ${plan},
        subscription_status = ${subscriptionStatus},
        monthly_quota = ${newQuota},
        subscription_start_date = ${subscriptionStatus !== 'free' ? now.toISOString() : null},
        subscription_end_date = ${subscriptionEndDate?.toISOString() || null},
        subscription_cancel_at_period_end = FALSE,
        quota_reset_date = ${nextMonth.toISOString()},
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    // 8. Registrar acción en logs
    await logAdminAction({
      adminUserId: auth.userId,
      action: 'change_plan',
      targetUserId: userId,
      details: {
        target_email: user.email,
        old_plan: oldPlan,
        new_plan: plan,
        old_status: oldStatus,
        new_status: subscriptionStatus,
        old_quota: oldQuota,
        new_quota: newQuota,
        trial_days: trialDays || null,
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('Plan changed by admin', {
      adminId: auth.userId,
      targetUserId: userId,
      targetEmail: user.email,
      oldPlan,
      newPlan: plan,
    });

    return NextResponse.json({
      success: true,
      message: 'Plan actualizado correctamente',
      data: {
        plan,
        status: subscriptionStatus,
        quota: newQuota,
        trial_ends: subscriptionEndDate?.toISOString() || null,
      },
    });
  } catch (error: any) {
    logger.error('Error changing plan', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
