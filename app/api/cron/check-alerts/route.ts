import { NextResponse } from 'next/server';
import { checkHighCostUsers, checkQuotaExceeded } from '@/lib/admin-alerts';
import { logger } from '@/lib/logger';

/**
 * Cron Job: Verificación de alertas cada hora
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

    logger.info('Starting alert checks cron job');

    // Ejecutar verificaciones
    const highCostAlerts = await checkHighCostUsers();
    const quotaAlerts = await checkQuotaExceeded();

    const totalAlertsCreated = highCostAlerts + quotaAlerts;

    logger.info('Alert checks completed', {
      highCostAlerts,
      quotaAlerts,
      totalAlertsCreated,
    });

    return NextResponse.json({
      success: true,
      highCostAlerts,
      quotaAlerts,
      totalAlertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error in alert checks cron', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
