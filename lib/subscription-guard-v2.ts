// Sistema de cuotas separadas v2: Documentos + Audio
import { sql } from '@vercel/postgres';
import { logger } from './logger';
import { validateUserId, DatabaseError, NotFoundError } from './errors';
import type { SubscriptionPlan } from '@/types/user';

export interface SeparateQuotaStatus {
  isActive: boolean;
  plan: SubscriptionPlan;

  // Cuotas de documentos
  quotaDocs: number;
  usageDocs: number;
  remainingDocs: number;
  canUploadDocs: boolean;

  // Cuotas de audio (en minutos)
  quotaAudioMinutes: number;
  usageAudioMinutes: number;
  remainingAudioMinutes: number;
  canUploadAudio: boolean;

  // Límites
  maxPagesPerPdf: number;

  // General
  resetDate: Date | null;
  message?: string;
  upgradeUrl?: string;
}

/**
 * Verificar el estado de cuotas separadas de un usuario
 */
export async function checkSeparateQuotas(userId: string | number): Promise<SeparateQuotaStatus> {
  validateUserId(userId);

  try {
    const result = await sql`
      SELECT
        id,
        email,
        subscription_plan,
        subscription_status,
        monthly_quota_docs,
        monthly_quota_audio_minutes,
        monthly_usage_docs,
        monthly_usage_audio_minutes,
        max_pages_per_pdf,
        quota_reset_date
      FROM users
      WHERE id = ${userId}
    `;

    if (result.rows.length === 0) {
      logger.error('User not found in quota check', { userId });
      throw new NotFoundError('Usuario', userId);
    }

    const user = result.rows[0];

    // Valores por defecto
    const plan = user.subscription_plan || 'free';
    const status = user.subscription_status || 'free';
    const quotaDocs = user.monthly_quota_docs || 10;
    const quotaAudioMinutes = user.monthly_quota_audio_minutes || 10;
    const usageDocs = user.monthly_usage_docs || 0;
    const usageAudioMinutes = user.monthly_usage_audio_minutes || 0;
    const maxPagesPerPdf = user.max_pages_per_pdf || 50;
    const resetDate = user.quota_reset_date ? new Date(user.quota_reset_date) : null;

    // Calcular restantes
    const remainingDocs = Math.max(0, quotaDocs - usageDocs);
    const remainingAudioMinutes = Math.max(0, quotaAudioMinutes - usageAudioMinutes);

    // Verificar si la suscripción está activa
    const isActive = ['active', 'trialing', 'free'].includes(status);

    // Verificar permisos de subida
    const canUploadDocs = isActive && remainingDocs > 0;
    const canUploadAudio = isActive && remainingAudioMinutes > 0;

    // Generar mensaje apropiado
    let message: string | undefined;
    let upgradeUrl: string | undefined;

    if (!isActive) {
      message = `Tu suscripción está ${status}. Por favor, actualiza tu método de pago.`;
      upgradeUrl = '/settings';
    } else if (remainingDocs === 0 && remainingAudioMinutes === 0) {
      message = `Has alcanzado ambos límites de tu plan ${plan}. Documentos: ${quotaDocs}, Audio: ${quotaAudioMinutes} min.`;
      upgradeUrl = '/pricing';
    } else if (remainingDocs === 0) {
      message = `Has alcanzado el límite de ${quotaDocs} documentos de tu plan ${plan}. Te quedan ${remainingAudioMinutes} minutos de audio.`;
      upgradeUrl = '/pricing';
    } else if (remainingAudioMinutes === 0) {
      message = `Has alcanzado el límite de ${quotaAudioMinutes} minutos de audio de tu plan ${plan}. Te quedan ${remainingDocs} documentos.`;
      upgradeUrl = '/pricing';
    }

    logger.info('Separate quotas checked', {
      userId,
      plan,
      quotaDocs,
      usageDocs,
      remainingDocs,
      quotaAudioMinutes,
      usageAudioMinutes,
      remainingAudioMinutes,
      canUploadDocs,
      canUploadAudio,
    });

    return {
      isActive,
      plan: plan as SubscriptionPlan,
      quotaDocs,
      usageDocs,
      remainingDocs,
      canUploadDocs,
      quotaAudioMinutes,
      usageAudioMinutes,
      remainingAudioMinutes,
      canUploadAudio,
      maxPagesPerPdf,
      resetDate,
      message,
      upgradeUrl,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Error checking separate quotas', error, { userId });
    throw new DatabaseError('checkSeparateQuotas', error);
  }
}

/**
 * Incrementar uso de documentos
 */
export async function incrementDocUsage(userId: string | number, count: number = 1): Promise<void> {
  validateUserId(userId);

  try {
    await sql`
      UPDATE users
      SET monthly_usage_docs = monthly_usage_docs + ${count}
      WHERE id = ${userId}
    `;

    logger.info('Document usage incremented', { userId, count });
  } catch (error) {
    logger.error('Error incrementing doc usage', error, { userId });
    throw new DatabaseError('incrementDocUsage', error);
  }
}

/**
 * Incrementar uso de audio (en minutos)
 */
export async function incrementAudioUsage(userId: string | number, minutes: number): Promise<void> {
  validateUserId(userId);

  try {
    // Redondear hacia arriba (siempre cobrar mínimo 1 minuto)
    const roundedMinutes = Math.ceil(minutes);

    await sql`
      UPDATE users
      SET monthly_usage_audio_minutes = monthly_usage_audio_minutes + ${roundedMinutes}
      WHERE id = ${userId}
    `;

    logger.info('Audio usage incremented', { userId, minutes: roundedMinutes });
  } catch (error) {
    logger.error('Error incrementing audio usage', error, { userId });
    throw new DatabaseError('incrementAudioUsage', error);
  }
}

/**
 * Resetear todas las cuotas de un usuario
 */
export async function resetSeparateUsage(userId: string | number): Promise<void> {
  validateUserId(userId);

  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await sql`
      UPDATE users
      SET
        monthly_usage_docs = 0,
        monthly_usage_audio_minutes = 0,
        quota_reset_date = ${nextMonth.toISOString()}
      WHERE id = ${userId}
    `;

    logger.info('User separate usage reset', { userId });
  } catch (error) {
    logger.error('Error resetting separate usage', error, { userId });
    throw new DatabaseError('resetSeparateUsage', error);
  }
}

/**
 * Resetear uso de todos los usuarios (cron job mensual)
 */
export async function resetAllSeparateUsages(): Promise<{ count: number }> {
  try {
    const now = new Date();
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await sql`
      UPDATE users
      SET
        monthly_usage_docs = 0,
        monthly_usage_audio_minutes = 0,
        quota_reset_date = ${firstDayNextMonth.toISOString()}
      WHERE DATE_TRUNC('month', quota_reset_date) <= DATE_TRUNC('month', CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const count = result.rows.length;

    logger.info('All users separate usage reset', { count });

    return { count };
  } catch (error) {
    logger.error('Error resetting all separate usages', error);
    throw new DatabaseError('resetAllSeparateUsages', error);
  }
}

/**
 * Validar si un PDF cumple con el límite de páginas
 */
export async function validatePdfPages(userId: string | number, pageCount: number): Promise<{
  allowed: boolean;
  maxPages: number;
  message?: string;
}> {
  validateUserId(userId);

  try {
    const result = await sql`
      SELECT max_pages_per_pdf
      FROM users
      WHERE id = ${userId}
    `;

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario', userId);
    }

    const maxPages = result.rows[0].max_pages_per_pdf || 50;
    const allowed = pageCount <= maxPages;

    const message = allowed
      ? undefined
      : `Este PDF tiene ${pageCount} páginas. Tu plan permite máximo ${maxPages} páginas por PDF.`;

    return {
      allowed,
      maxPages,
      message,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Error validating PDF pages', error, { userId, pageCount });
    throw new DatabaseError('validatePdfPages', error);
  }
}

/**
 * Obtener estadísticas de uso separadas
 */
export async function getSeparateUsageStats(userId: string | number): Promise<{
  plan: string;
  docs: { quota: number; usage: number; remaining: number; usagePercent: number };
  audio: { quota: number; usage: number; remaining: number; usagePercent: number };
  maxPagesPerPdf: number;
  resetDate: Date | null;
  daysUntilReset: number;
}> {
  const status = await checkSeparateQuotas(userId);

  const docsPercent = status.quotaDocs > 0
    ? Math.round((status.usageDocs / status.quotaDocs) * 100)
    : 0;

  const audioPercent = status.quotaAudioMinutes > 0
    ? Math.round((status.usageAudioMinutes / status.quotaAudioMinutes) * 100)
    : 0;

  const daysUntilReset = status.resetDate
    ? Math.ceil((status.resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    plan: status.plan,
    docs: {
      quota: status.quotaDocs,
      usage: status.usageDocs,
      remaining: status.remainingDocs,
      usagePercent: docsPercent,
    },
    audio: {
      quota: status.quotaAudioMinutes,
      usage: status.usageAudioMinutes,
      remaining: status.remainingAudioMinutes,
      usagePercent: audioPercent,
    },
    maxPagesPerPdf: status.maxPagesPerPdf,
    resetDate: status.resetDate,
    daysUntilReset,
  };
}
