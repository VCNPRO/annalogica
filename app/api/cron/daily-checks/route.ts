import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';
import { list, del } from '@vercel/blob';
import { checkHighCostUsers, checkQuotaExceeded } from '@/lib/admin-alerts';

/**
 * Cron Job Consolidado - Ejecuta TODAS las verificaciones diarias
 *
 * TAREAS:
 * 1. Actualizar costes totales de usuarios
 * 2. Limpieza de archivos Vercel Blob (>30 días)
 * 3. Refrescar vista materializada de métricas
 * 4. Verificar alertas de costes altos
 * 5. Verificar alertas de cuotas excedidas
 * 6. Enviar notificaciones por email (automático)
 *
 * Configurado en vercel.json - Se ejecuta 1 vez al día (9:00 AM UTC)
 */
export async function GET(request: Request) {
  try {
    // Verificar CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      logger.warn('Unauthorized cron attempt', {
        hasSecret: !!process.env.CRON_SECRET,
        authProvided: !!authHeader
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting daily checks cron job');
    const startTime = Date.now();
    const results: any = {};

    // ========================================
    // PASO 1: Actualizar costes de usuarios
    // ========================================
    try {
      const costResult = await sql`
        UPDATE users u
        SET
          total_cost_usd = (
            SELECT COALESCE(SUM(cost_usd), 0)
            FROM usage_logs
            WHERE user_id = u.id
          ),
          last_activity_at = (
            SELECT MAX(created_at)
            FROM usage_logs
            WHERE user_id = u.id
          ),
          updated_at = NOW()
        WHERE EXISTS (
          SELECT 1 FROM usage_logs WHERE user_id = u.id
        )
        RETURNING id
      `;
      results.costsUpdated = costResult.rows.length;
      logger.info('User costs updated', { count: results.costsUpdated });
    } catch (error) {
      logger.error('Error updating user costs', error);
      results.costsError = error instanceof Error ? error.message : 'Unknown error';
    }

    // ========================================
    // PASO 2: Limpieza de archivos antiguos
    // ========================================
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { blobs } = await list();
      let deletedCount = 0;

      for (const blob of blobs) {
        if (blob.uploadedAt < thirtyDaysAgo) {
          await del(blob.url);
          deletedCount++;
        }
      }

      results.blobsDeleted = deletedCount;
      logger.info('Blob cleanup completed', { deletedCount });
    } catch (error) {
      logger.error('Error cleaning blobs', error);
      results.blobsError = error instanceof Error ? error.message : 'Unknown error';
    }

    // ========================================
    // PASO 3: Refrescar métricas
    // ========================================
    try {
      await sql`SELECT refresh_user_metrics()`;
      results.metricsRefreshed = true;
      logger.info('Metrics refreshed');
    } catch (error) {
      logger.error('Error refreshing metrics', error);
      results.metricsError = error instanceof Error ? error.message : 'Unknown error';
    }

    // ========================================
    // PASO 4: Verificar alertas
    // ========================================
    try {
      const highCostAlerts = await checkHighCostUsers();
      const quotaAlerts = await checkQuotaExceeded();

      results.alertsCreated = {
        highCost: highCostAlerts,
        quotaExceeded: quotaAlerts,
        total: highCostAlerts + quotaAlerts,
      };

      logger.info('Alerts checked', results.alertsCreated);
    } catch (error) {
      logger.error('Error checking alerts', error);
      results.alertsError = error instanceof Error ? error.message : 'Unknown error';
    }

    // ========================================
    // RESUMEN
    // ========================================
    const duration = Date.now() - startTime;

    logger.info('Daily checks cron completed', { duration, results });

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    logger.error('Error in daily checks cron', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
