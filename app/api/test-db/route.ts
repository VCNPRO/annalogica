import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

/**
 * GET /api/test-db
 * Test database connection and job creation
 */
export async function GET(request: Request) {
  try {
    const user = verifyRequestAuth(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test creating a job
    const testJob = await TranscriptionJobDB.create(
      user.userId,
      'test-file.mp3',
      'https://example.com/test.mp3',
      'auto', // language
      1024 // audioSizeBytes
    );

    return NextResponse.json({
      success: true,
      message: 'Database test successful',
      job: testJob,
      jobId: testJob.id,
      jobIdType: typeof testJob.id,
      fullJob: JSON.stringify(testJob, null, 2)
    });
  } catch (error) {
    console.error('[test-db] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
