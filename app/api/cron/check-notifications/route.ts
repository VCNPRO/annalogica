import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  sendQuotaWarningEmail,
  sendTrialExpiringEmail,
} from '@/lib/email-notifications';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar CRON_SECRET para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const notifications = {
      quotaWarnings: 0,
      trialExpirations: 0,
      errors: [] as string[],
    };

    // 2. Verificar usuarios que han alcanzado 80% o 90% de cuota
    const quotaUsers = await sql`
      SELECT
        id,
        email,
        name,
        monthly_usage,
        monthly_quota,
        last_quota_warning_sent
      FROM users
      WHERE
        monthly_quota > 0
        AND monthly_usage >= (monthly_quota * 0.8)
        AND subscription_status IN ('active', 'trialing')
        AND (
          last_quota_warning_sent IS NULL
          OR last_quota_warning_sent < NOW() - INTERVAL '24 hours'
        )
    `;

    // Enviar advertencias de cuota
    for (const user of quotaUsers.rows) {
      const usagePercent = Math.round((user.monthly_usage / user.monthly_quota) * 100);

      try {
        await sendQuotaWarningEmail({
          userEmail: user.email,
          userName: user.name,
          currentUsage: user.monthly_usage,
          monthlyQuota: user.monthly_quota,
          usagePercent,
        });

        // Actualizar timestamp del último warning
        await sql`
          UPDATE users
          SET last_quota_warning_sent = NOW()
          WHERE id = ${user.id}
        `;

        notifications.quotaWarnings++;

        logger.info('Quota warning sent', {
          userId: user.id,
          email: user.email,
          usagePercent,
        });
      } catch (error: any) {
        const errorMsg = `Error sending quota warning to ${user.email}: ${error.message}`;
        notifications.errors.push(errorMsg);
        logger.error(errorMsg, error);
      }
    }

    // 3. Verificar trials que están por expirar (3 días y 1 día antes)
    const trialUsers = await sql`
      SELECT
        id,
        email,
        name,
        subscription_plan,
        subscription_end_date,
        last_trial_warning_sent
      FROM users
      WHERE
        subscription_status = 'trialing'
        AND subscription_end_date IS NOT NULL
        AND subscription_end_date > NOW()
        AND subscription_end_date <= NOW() + INTERVAL '3 days'
        AND (
          last_trial_warning_sent IS NULL
          OR last_trial_warning_sent < NOW() - INTERVAL '24 hours'
        )
    `;

    // Enviar advertencias de expiración de trial
    for (const user of trialUsers.rows) {
      const endDate = new Date(user.subscription_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Solo enviar en días específicos (3 días antes y 1 día antes)
      if (daysRemaining === 3 || daysRemaining === 1) {
        try {
          await sendTrialExpiringEmail({
            userEmail: user.email,
            userName: user.name,
            plan: user.subscription_plan,
            daysRemaining,
            endDate,
          });

          // Actualizar timestamp del último warning
          await sql`
            UPDATE users
            SET last_trial_warning_sent = NOW()
            WHERE id = ${user.id}
          `;

          notifications.trialExpirations++;

          logger.info('Trial expiring warning sent', {
            userId: user.id,
            email: user.email,
            daysRemaining,
          });
        } catch (error: any) {
          const errorMsg = `Error sending trial warning to ${user.email}: ${error.message}`;
          notifications.errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }
    }

    // 4. Verificar trials que ya expiraron y cambiar a plan free
    const expiredTrials = await sql`
      SELECT
        id,
        email,
        name,
        subscription_plan
      FROM users
      WHERE
        subscription_status = 'trialing'
        AND subscription_end_date IS NOT NULL
        AND subscription_end_date <= NOW()
    `;

    for (const user of expiredTrials.rows) {
      try {
        // Cambiar a plan free
        await sql`
          UPDATE users
          SET
            subscription_plan = 'free',
            subscription_status = 'free',
            monthly_quota = 60,
            subscription_end_date = NULL,
            subscription_cancel_at_period_end = FALSE,
            updated_at = NOW()
          WHERE id = ${user.id}
        `;

        logger.info('Trial expired - downgraded to free', {
          userId: user.id,
          email: user.email,
          previousPlan: user.subscription_plan,
        });
      } catch (error: any) {
        const errorMsg = `Error downgrading expired trial for ${user.email}: ${error.message}`;
        notifications.errors.push(errorMsg);
        logger.error(errorMsg, error);
      }
    }

    logger.info('Notification cron job completed', notifications);

    return NextResponse.json({
      success: true,
      message: 'Notification checks completed',
      notifications,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error in notification cron job', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
