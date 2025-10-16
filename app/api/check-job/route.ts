import { NextRequest, NextResponse } from 'next/server';
import { TranscriptionJobDB } from '@/lib/db';

/**
 * Debug endpoint to check job status directly from DB
 * GET /api/check-job?jobId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      );
    }

    const job = await TranscriptionJobDB.findById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        filename: job.filename,
        language: job.language,
        has_txt: !!job.txt_url,
        has_srt: !!job.srt_url,
        has_vtt: !!job.vtt_url,
        has_summary: !!job.summary_url,
        has_speakers: !!job.speakers_url,
        assemblyai_id: job.assemblyai_id,
        metadata: job.metadata,
        created_at: job.created_at,
        updated_at: job.updated_at
      }
    });
  } catch (error: any) {
    console.error('[Check Job] Error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
