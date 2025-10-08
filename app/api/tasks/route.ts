import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const user = verifyRequestAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parse request body
    const { jobId, task } = await request.json();

    if (!jobId || !task) {
      return NextResponse.json({ error: 'jobId y task son requeridos' }, { status: 400 });
    }

    // 3. Verify that the job belongs to the user
    const job = await TranscriptionJobDB.findById(jobId);
    if (!job || job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Job no encontrado o no autorizado' }, { status: 404 });
    }

    // 4. Determine the Inngest event to send
    let eventName: string;
    switch (task) {
      case 'transcribe':
        eventName = 'task/transcribe';
        break;
      case 'summarize':
        eventName = 'task/summarize';
        break;
      default:
        return NextResponse.json({ error: 'Tarea no válida' }, { status: 400 });
    }

    // 5. Send the event to Inngest
    await inngest.send({
      name: eventName,
      data: {
        jobId: job.id, // Pass the full job data for context
        userId: user.userId,
        audioUrl: job.audio_url,
        filename: job.filename,
      },
    });

    console.log(`[API Tasks] Task '${task}' sent to Inngest for job ${jobId}`);

    return NextResponse.json({ success: true, message: `Tarea '${task}' iniciada.` });

  } catch (error: any) {
    console.error('[API Tasks] Error:', error);
    return NextResponse.json({ error: error.message || 'Error al iniciar la tarea' }, { status: 500 });
  }
}
