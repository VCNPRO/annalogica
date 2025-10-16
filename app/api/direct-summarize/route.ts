import { NextRequest, NextResponse } from 'next/server';
import { TranscriptionJobDB } from '@/lib/db';
import { generateSummaryWithLeMUR, saveSummary } from '@/lib/assemblyai-client';
import { logSummary } from '@/lib/usage-tracking';

/**
 * Emergency endpoint to run summarization directly (bypass Inngest)
 * POST /api/direct-summarize
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

    console.log(`[Direct Summarize] Starting for job ${jobId}`);

    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || !job.txt_url) {
      return NextResponse.json(
        { error: 'Job not found or not transcribed yet' },
        { status: 404 }
      );
    }

    if (!job.assemblyai_id) {
      return NextResponse.json(
        { error: 'No AssemblyAI transcript ID available' },
        { status: 400 }
      );
    }

    const { user_id: userId, filename, metadata } = job;

    // Generate summary with LeMUR
    console.log(`[Direct Summarize] Calling LeMUR for transcript ${job.assemblyai_id}`);
    const { summary, tags } = await generateSummaryWithLeMUR(
      job.assemblyai_id,
      job.language || 'es'
    );

    if (!summary) {
      await TranscriptionJobDB.updateStatus(jobId, 'failed', 'Summary generation failed');
      return NextResponse.json(
        { error: 'LeMUR returned empty summary' },
        { status: 500 }
      );
    }

    // Save summary
    console.log(`[Direct Summarize] Saving summary`);
    const summaryUrl = await saveSummary(summary, filename);

    // Update database
    const newMetadata = { ...metadata, tags };
    await TranscriptionJobDB.updateResults(jobId, {
      summaryUrl,
      metadata: newMetadata,
    });

    // Log usage
    const tokensInput = Math.ceil((job.txt_url?.length || 0) / 4);
    const tokensOutput = Math.ceil(summary.length / 4);
    await logSummary(userId, tokensInput, tokensOutput);

    // Update status to completed
    await TranscriptionJobDB.updateStatus(jobId, 'completed');

    console.log(`[Direct Summarize] Completed successfully for job ${jobId}`);

    return NextResponse.json({
      success: true,
      message: `Summarization completed for job ${jobId}`,
      summaryUrl,
      tags
    });
  } catch (error: any) {
    console.error('[Direct Summarize] Error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
