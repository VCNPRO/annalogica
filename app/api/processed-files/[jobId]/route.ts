import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { del } from '@vercel/blob';

export async function DELETE(request: NextRequest, params: any) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { jobId } = params;

    // First, get the job details to retrieve blob URLs
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || job.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Trabajo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Delete associated blobs from Vercel Blob
    const blobDeletePromises = [];
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN not configured for blob deletion.');
      // Proceed without deleting blobs if token is missing, but log error
    } else {
      if (job.txt_url) blobDeletePromises.push(del(job.txt_url, { token: blobToken }));
      if (job.srt_url) blobDeletePromises.push(del(job.srt_url, { token: blobToken }));
      if (job.vtt_url) blobDeletePromises.push(del(job.vtt_url, { token: blobToken }));
      if (job.summary_url) blobDeletePromises.push(del(job.summary_url, { token: blobToken }));
      if (job.speakers_url) blobDeletePromises.push(del(job.speakers_url, { token: blobToken }));

      // Execute all blob deletions in parallel
      await Promise.allSettled(blobDeletePromises); // Use allSettled to not fail if one blob deletion fails
      console.log(`[DELETE] Attempted to delete blobs for job ${jobId}`);
    }

    // Then, delete the job from the database
    const deleted = await TranscriptionJobDB.delete(jobId, auth.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Error al eliminar el trabajo de la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Trabajo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting processed file:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
