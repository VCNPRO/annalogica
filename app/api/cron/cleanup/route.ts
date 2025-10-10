import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldFilesAndRecords } from '@/lib/blob-cleanup';

/**
 * Cron job endpoint to clean up old files
 * This should be called daily via Vercel Cron or external scheduler
 *
 * Security: Uses Authorization header to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run cleanup
    console.log('[Cron] Starting cleanup job...');
    const result = await cleanupOldFilesAndRecords(30);

    console.log('[Cron] Cleanup job completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      ...result
    });

  } catch (error: any) {
    console.error('[Cron] Error in cleanup job:', error);
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
