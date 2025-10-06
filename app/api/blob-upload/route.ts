import { put } from '@vercel/blob';
import { verifyRequestAuth } from '@/lib/auth';
import { uploadRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logUpload } from '@/lib/usage-tracking';

// File size limits (in bytes)
const MAX_FILE_SIZE_AUDIO = 500 * 1024 * 1024; // 500 MB - ~8 horas podcast
const MAX_FILE_SIZE_VIDEO = 2 * 1024 * 1024 * 1024; // 2 GB - 1-2 horas HD

// Allowed MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
];

export async function POST(request: Request): Promise<Response> {
  try {
    // SECURITY: Verify user authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json(
        { error: 'No autorizado. Debes iniciar sesión para subir archivos.' },
        { status: 401 }
      );
    }

    // SECURITY: Rate limiting
    const identifier = getClientIdentifier(request, user.userId);
    const rateLimitResponse = await checkRateLimit(uploadRateLimit, identifier, 'archivos subidos');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // SECURITY: Validate file type
    const isAudioAllowed = ALLOWED_AUDIO_TYPES.includes(file.type);
    const isVideoAllowed = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isAudioAllowed && !isVideoAllowed) {
      return Response.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan archivos de audio (MP3, WAV, OGG, M4A) o video (MP4, WEBM, MOV).' },
        { status: 400 }
      );
    }

    // SECURITY: Validate file size
    const maxSize = isAudioAllowed ? MAX_FILE_SIZE_AUDIO : MAX_FILE_SIZE_VIDEO;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024;
      const fileType = isAudioAllowed ? 'audio' : 'video';
      return Response.json(
        { error: `El archivo ${fileType} es demasiado grande. Tamaño máximo: ${maxSizeMB} MB` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('Archivo subido exitosamente:', blob.url);

    // TRACKING: Log upload
    try {
      await logUpload(user.userId, file.size, blob.pathname, file.type);
    } catch (e) {
      console.error('Failed to log upload:', e);
    }

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error('Error en blob-upload:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}