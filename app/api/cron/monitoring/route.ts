import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';
import { checkHighCostUsers, checkQuotaExceeded } from '@/lib/admin-alerts';

/**
 * Cron Job de Monitoreo Diario (8:00 AM UTC)
 * - Verificar alertas de costes altos
 * - Verificar alertas de cuotas excedidas
 * - Enviar notificaciones por email
 *
 * Configurado en vercel.json
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

    logger.info('Starting monitoring cron job');
    const startTime = Date.now();

    // Ejecutar verificaciones de alertas
    const highCostAlerts = await checkHighCostUsers();
    const quotaAlerts = await checkQuotaExceeded();

    const totalAlertsCreated = highCostAlerts + quotaAlerts;
    const duration = Date.now() - startTime;

    logger.info('Monitoring cron completed', {
      duration,
      highCostAlerts,
      quotaAlerts,
      totalAlertsCreated,
    });

    return NextResponse.json({
      success: true,
      duration,
      highCostAlerts,
      quotaAlerts,
      totalAlertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error in monitoring cron', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
