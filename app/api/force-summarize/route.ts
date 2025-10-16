import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

/**
 * Emergency endpoint to force summarization for a job
 * POST /api/force-summarize
 * Body: { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    // Send summarization event directly to Inngest
    await inngest.send({
      name: 'task/summarize',
      data: { jobId }
    });

    console.log(`[Force Summarize] Triggered summarization for job ${jobId}`);

    return NextResponse.json({
      success: true,
      message: `Summarization triggered for job ${jobId}`
    });
  } catch (error: any) {
    console.error('[Force Summarize] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
