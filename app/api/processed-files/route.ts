import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const summaryJobs = await TranscriptionJobDB.findByUserId(auth.userId);

    // 🔥 FIX: Fetch the full job object for each job to ensure all data is present
    const jobs = await Promise.all(
      summaryJobs.map(job => TranscriptionJobDB.findById(job.id))
    );

    // Filter out any null results if a job was deleted during the fetch
    const validJobs = jobs.filter(job => job !== null);

    return NextResponse.json({ success: true, jobs: validJobs });
  } catch (error) {
    console.error('Error fetching processed files:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
