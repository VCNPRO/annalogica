import { list, del } from '@vercel/blob';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get completed jobs from database
    const jobs = await TranscriptionJobDB.findByUserId(user.userId);

    // DEBUG: Log the raw metadata from the DB
    jobs.forEach(job => {
      console.log(`[API Files] Metadata for job ${job.id}:`, JSON.stringify(job.metadata, null, 2));
    });

    // Return all jobs for the frontend to display
    const files = jobs.map(job => ({
        name: job.filename.replace(/\.[^/.]+$/, ''), // Remove extension
        date: job.created_at,
        txtUrl: job.txt_url,
        srtUrl: job.srt_url,
        vttUrl: job.vtt_url,
        summaryUrl: job.summary_url,
        // audioUrl: REMOVED - original files deleted immediately after processing
        audioDuration: job.audio_duration_seconds,
        jobId: job.id,
        status: job.status, // Include status for UI
        metadata: job.metadata,
    }));

    return Response.json({ files });

  } catch (error: any) {
    console.error('[API Files] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { filename } = await request.json();
    const { blobs } = await list();
    
    // Eliminar todos los archivos relacionados
    const toDelete = blobs.filter(b => b.pathname.startsWith(filename));
    await Promise.all(toDelete.map(b => del(b.url)));
    
    return Response.json({ success: true });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
