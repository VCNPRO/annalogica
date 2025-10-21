// GET -> estado por jobId (siempre incluye `metadata`)
export async function GET(_req: Request, context: any) {
  try {
    const jobId: string | undefined =
      context?.params?.jobId ?? context?.params?.id ?? context?.jobId;

    if (!jobId) {
      return NextResponse.json(
        {
          error: 'missing_jobId',
          id: null,
          status: 'failed',
          progress: undefined,
          metadata: {}, // 👈 siempre presente
          updatedAt: undefined,
        },
        { status: 400 }
      );
    }

    const job = await TranscriptionJobDB.findById(jobId);
    if (!job) {
      return NextResponse.json(
        {
          error: 'not_found',
          id: jobId,
          status: 'failed',
          progress: undefined,
          metadata: { notFound: true }, // 👈 siempre presente
          updatedAt: undefined,
        },
        { status: 404 }
      );
    }

    const metadata = job.metadata ?? {}; // 👈 siempre objeto
    const progress =
      typeof metadata.progress === 'number' ? metadata.progress : undefined;

    return NextResponse.json({
      id: jobId,
      status: job.status,               // 'pending' | 'processing' | 'transcribed' | 'summarized' | 'completed' | 'failed'
      progress,
      metadata,                         // 👈 siempre presente
      error: metadata.error ?? null,
      updatedAt: job.updated_at ? new Date(job.updated_at).toISOString() : undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || 'status_error',
        id: null,
        status: 'failed',
        progress: undefined,
        metadata: {}, // 👈 siempre presente
        updatedAt: undefined,
      },
      { status: 500 }
    );
  }
}
