// app/api/transcriptions/[id]/route.js
import { NextResponse } from 'next/server';
import { getTranscriptionJob, deleteTranscriptionJob } from '@/lib/db/transcriptions';

export async function GET(request, { params }) {
  try {
    // TODO: Obtener userId de tu sistema de autenticación
    const userId = request.headers.get('x-user-id') || 'test-user';
    
    const jobId = params.id;
    
    // Obtener trabajo
    const job = await getTranscriptionJob(jobId, userId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Trabajo no encontrado' },
        { status: 404 }
      );
    }

    // Preparar respuesta
    const response = {
      id: job.id,
      fileName: job.filename,
      status: job.status,
      processingProgress: job.processing_progress,
      errorMessage: job.error_message,
      createdAt: job.created_at,
    };

    // Si está completado, incluir todos los resultados
    if (job.status === 'completed') {
      response.duration = job.audio_duration_seconds;
      response.txtUrl = job.txt_url;
      response.srtUrl = job.srt_url;
      response.vttUrl = job.vtt_url;
      response.summaryUrl = job.summary_url;
      response.speakersUrl = job.speakers_url;
      response.tags = job.tags;
      response.metadata = job.metadata;
      response.completedAt = job.completed_at;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo trabajo:', error);
    return NextResponse.json(
      { error: 'Error al obtener el trabajo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // TODO: Obtener userId de tu sistema de autenticación
    const userId = request.headers.get('x-user-id') || 'test-user';
    
    const jobId = params.id;
    
    await deleteTranscriptionJob(jobId, userId);
    
    return NextResponse.json({
      success: true,
      message: 'Trabajo eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando trabajo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el trabajo' },
      { status: 500 }
    );
  }
}
