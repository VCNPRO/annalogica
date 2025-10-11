// Middleware para validar suscripciones y cuotas
import { sql } from '@vercel/postgres';
import { logger } from './logger';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  quota: number;
  usage: number;
  remaining: number;
  resetDate: Date | null;
  canUpload: boolean;
  message?: string;
  upgradeUrl?: string;
}

/**
 * Verifica el estado de la suscripción de un usuario y si puede subir archivos
 */
export async function checkSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
  try {
    // Obtener datos del usuario
    const result = await sql`
      SELECT
        id,
        email,
        subscription_plan,
        subscription_status,
        monthly_quota,
        monthly_usage,
        quota_reset_date
      FROM users
      WHERE id = ${userId}
    `;

    if (result.rows.length === 0) {
      logger.error('User not found in subscription check', { userId });
      return {
        isActive: false,
        plan: 'unknown',
        quota: 0,
        usage: 0,
        remaining: 0,
        resetDate: null,
        canUpload: false,
        message: 'Usuario no encontrado',
      };
    }

    const user = result.rows[0];

    // Calcular estado
    const plan = user.subscription_plan || 'free';
    const status = user.subscription_status || 'free';
    const quota = user.monthly_quota || 10;
    const usage = user.monthly_usage || 0;
    const remaining = Math.max(0, quota - usage);
    const resetDate = user.quota_reset_date ? new Date(user.quota_reset_date) : null;

    // Verificar si la suscripción está activa
    const isActive = ['active', 'trialing', 'free'].includes(status);

    // Verificar si puede subir archivos
    const canUpload = isActive && remaining > 0;

    // Generar mensaje apropiado
    let message: string | undefined;
    let upgradeUrl: string | undefined;

    if (!isActive) {
      message = `Tu suscripción está ${status}. Por favor, actualiza tu método de pago.`;
      upgradeUrl = '/settings';
    } else if (remaining === 0) {
      message = `Has alcanzado el límite de ${quota} archivos de tu plan ${plan}.`;
      upgradeUrl = '/pricing';
    }

    logger.info('Subscription status checked', {
      userId,
      plan,
      status,
      quota,
      usage,
      remaining,
      canUpload,
    });

    return {
      isActive,
      plan,
      quota,
      usage,
      remaining,
      resetDate,
      canUpload,
      message,
      upgradeUrl,
    };
  } catch (error) {
    logger.error('Error checking subscription status', error);
    throw new Error('Error al verificar suscripción');
  }
}

/**
 * Incrementa el uso mensual del usuario
 */
export async function incrementUsage(userId: number): Promise<void> {
  try {
    await sql`
      UPDATE users
      SET monthly_usage = monthly_usage + 1
      WHERE id = ${userId}
    `;

    logger.info('Monthly usage incremented', { userId });
  } catch (error) {
    logger.error('Error incrementing usage', error, { userId });
    throw new Error('Error al actualizar uso mensual');
  }
}

/**
 * Resetea el uso mensual de un usuario (para testing o ajustes manuales)
 */
export async function resetUsage(userId: number): Promise<void> {
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await sql`
      UPDATE users
      SET
        monthly_usage = 0,
        quota_reset_date = ${nextMonth.toISOString()}
      WHERE id = ${userId}
    `;

    logger.info('User usage reset', { userId });
  } catch (error) {
    logger.error('Error resetting usage', error, { userId });
    throw new Error('Error al resetear uso');
  }
}

/**
 * Resetea el uso mensual de todos los usuarios (para cron job)
 */
export async function resetAllUsages(): Promise<{ count: number }> {
  try {
    const now = new Date();
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await sql`
      UPDATE users
      SET
        monthly_usage = 0,
        quota_reset_date = ${firstDayNextMonth.toISOString()}
      WHERE DATE_TRUNC('month', quota_reset_date) <= DATE_TRUNC('month', CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const count = result.rows.length;

    logger.info('All users usage reset', { count });

    return { count };
  } catch (error) {
    logger.error('Error resetting all usages', error);
    throw new Error('Error al resetear uso de todos los usuarios');
  }
}

/**
 * Obtiene estadísticas de uso para un usuario
 */
export async function getUserUsageStats(userId: number): Promise<{
  plan: string;
  quota: number;
  usage: number;
  remaining: number;
  usagePercent: number;
  resetDate: Date | null;
  daysUntilReset: number;
}> {
  const status = await checkSubscriptionStatus(userId);

  const usagePercent = status.quota > 0
    ? Math.round((status.usage / status.quota) * 100)
    : 0;

  const daysUntilReset = status.resetDate
    ? Math.ceil((status.resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    plan: status.plan,
    quota: status.quota,
    usage: status.usage,
    remaining: status.remaining,
    usagePercent,
    resetDate: status.resetDate,
    daysUntilReset,
  };
}

/**
 * Verifica si un usuario necesita actualizar su plan
 */
export function shouldSuggestUpgrade(stats: {
  usage: number;
  quota: number;
  daysUntilReset: number;
}): boolean {
  const usagePercent = (stats.usage / stats.quota) * 100;

  // Sugerir upgrade si:
  // - Ha usado más del 80% de su cuota
  // - Quedan más de 7 días hasta el reset
  return usagePercent >= 80 && stats.daysUntilReset > 7;
}
