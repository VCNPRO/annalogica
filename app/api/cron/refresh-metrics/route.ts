import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

/**
 * Cron Job: Refrescar vista materializada de métricas cada 6 horas
 * Configurado en vercel.json
 */
export async function GET(request: Request) {
  try {
    // Verificar CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      logger.warn('Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting metrics refresh cron job');

    const startTime = Date.now();

    // Refrescar vista materializada
    await sql`SELECT refresh_user_metrics()`;

    const duration = Date.now() - startTime;

    logger.info('Metrics refresh completed', { duration });

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error refreshing metrics', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
