import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldFilesAndRecords } from '@/lib/blob-cleanup';
import { logger } from '@/lib/logger';

/**
 * Cron job endpoint to clean up old files
 * This should be called daily via Vercel Cron or external scheduler
 *
 * Security: Uses Authorization header to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.security('Unauthorized cron access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run cleanup
    logger.info('Starting cleanup job');
    const result = await cleanupOldFilesAndRecords(30);

    const duration = Date.now() - startTime;
    logger.performance('Cleanup job completed', duration, result);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      ...result
    });

  } catch (error: any) {
    logger.error('Error in cleanup job', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

// Allow POST as well for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
