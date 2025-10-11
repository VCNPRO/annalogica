// Cron job para resetear cuotas mensuales
// Se ejecuta el 1º de cada mes a las 00:00 UTC
import { NextRequest, NextResponse } from 'next/server';
import { resetAllUsages } from '@/lib/subscription-guard';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.security('Unauthorized cron access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: '/api/cron/reset-quotas',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ejecutar reset de cuotas
    logger.info('Starting monthly quota reset');

    const result = await resetAllUsages();

    const duration = Date.now() - startTime;

    logger.performance('Monthly quota reset completed', duration, {
      usersReset: result.count,
    });

    return NextResponse.json({
      success: true,
      message: 'Cuotas mensuales reseteadas correctamente',
      usersReset: result.count,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Error resetting monthly quotas', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al resetear cuotas mensuales',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
