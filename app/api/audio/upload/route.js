// app/api/audio/upload/route.js
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { inngest } from '@/lib/inngest/client';
import { createTranscriptionJob } from '@/lib/db/transcriptions';
import { trackError, extractRequestContext } from '@/lib/error-tracker';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  let formData;
  let file;
  let summaryType;

  try {
    // TODO: Obtener userId de tu sistema de autenticación
    // Por ahora usa un userId temporal para testing
    const userId = request.headers.get('x-user-id') || 'test-user';

    formData = await request.formData();
    file = formData.get('file');
    summaryType = formData.get('summaryType') || 'detailed';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a',
      'audio/ogg', 'audio/flac', 'audio/webm'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Usa MP3, WAV, M4A, OGG, FLAC o WebM' },
        { status: 400 }
      );
    }

    // Validar tamaño (Whisper límite 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 25MB' },
        { status: 400 }
      );
    }

    console.log('📤 Subiendo archivo:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type
    });

    // Subir a Vercel Blob
    const blob = await put(`audio/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type
    });

    console.log('✅ Archivo subido a Blob:', blob.url);

    // Crear registro en base de datos
    const job = await createTranscriptionJob({
      userId,
      fileName: file.name,
      fileSize: file.size,
      audioUrl: blob.url,
      summaryType
    });

    console.log('📄 Job creado en BD:', job.id);

    // Disparar proceso en Inngest
    await inngest.send({
      name: 'audio/transcribe.requested',
      data: {
        jobId: job.id,
        audioUrl: blob.url,
        fileName: file.name,
        userId,
        summaryType
      }
    });

    console.log('🚀 Proceso Inngest disparado');

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Archivo subido correctamente. La transcripción comenzará en breve.'
    });

  } catch (error) {
    console.error('❌ Error en upload:', error);

    // Track error en sistema de monitoreo
    const context = extractRequestContext(request);
    await trackError(
      'upload_error',
      'high',
      error.message || 'Error desconocido en upload de audio',
      error,
      {
        ...context,
        metadata: {
          fileName: file?.name,
          fileSize: file?.size,
          summaryType,
        }
      }
    );

    return NextResponse.json(
      { error: 'Error al procesar el archivo', details: error.message },
      { status: 500 }
    );
  }
}
