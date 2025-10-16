import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

/**
 * Cron Job: Actualizar costes totales de usuarios diariamente
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

    logger.info('Starting user costs update cron job');

    // Actualizar total_cost_usd para todos los usuarios
    const result = await sql`
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

    const updatedCount = result.rows.length;

    logger.info('User costs updated', { updatedCount });

    return NextResponse.json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error updating user costs', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
