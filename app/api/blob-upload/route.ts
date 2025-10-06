import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
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
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Extract file info from clientPayload
        const payload = typeof clientPayload === 'string'
          ? JSON.parse(clientPayload)
          : clientPayload;

        const fileSize = payload?.size || 0;
        const fileType = payload?.type || '';
        const token = payload?.token || '';

        // SECURITY: Verify user authentication from clientPayload
        if (!token) {
          throw new Error('No autorizado. Debes iniciar sesión para subir archivos.');
        }

        const { verifyToken } = await import('@/lib/auth');
        const user = verifyToken(token);

        if (!user) {
          throw new Error('No autorizado. Token inválido.');
        }

        // SECURITY: Rate limiting
        const identifier = getClientIdentifier(request, user.userId);
        const rateLimitResponse = await checkRateLimit(uploadRateLimit, identifier, 'archivos subidos');
        if (rateLimitResponse) {
          throw new Error('Demasiados archivos subidos. Intenta de nuevo más tarde.');
        }

        // SECURITY: Validate file type first
        const isAudioAllowed = ALLOWED_AUDIO_TYPES.includes(fileType);
        const isVideoAllowed = ALLOWED_VIDEO_TYPES.includes(fileType);

        if (!isAudioAllowed && !isVideoAllowed) {
          throw new Error(
            'Tipo de archivo no permitido. Solo se aceptan archivos de audio (MP3, WAV, OGG, M4A) o video (MP4, WEBM, MOV).'
          );
        }

        // SECURITY: Validate file size based on type
        const maxSize = isAudioAllowed ? MAX_FILE_SIZE_AUDIO : MAX_FILE_SIZE_VIDEO;
        if (fileSize > maxSize) {
          const maxSizeMB = maxSize / 1024 / 1024;
          const fileType = isAudioAllowed ? 'audio' : 'video';
          throw new Error(
            `El archivo ${fileType} es demasiado grande. Tamaño máximo: ${maxSizeMB} MB`
          );
        }

        return {
          allowedContentTypes: [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_SIZE_VIDEO,
          tokenPayload: JSON.stringify({
            userId: user.userId,
            email: user.email,
            timestamp: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Archivo subido exitosamente:', blob.url);

        // TRACKING: Log upload
        try {
          const payload = JSON.parse(tokenPayload as string);
          await logUpload(payload.userId, blob.size, blob.pathname, blob.contentType || 'unknown');
        } catch (e) {
          console.error('Failed to log upload:', e);
        }
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error('Error en blob-upload:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: error instanceof Error && error.message.includes('autorizado') ? 401 : 400 }
    );
  }
}