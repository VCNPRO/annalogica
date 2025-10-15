import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

// File size limits (in bytes)
const MAX_FILE_SIZE_AUDIO = 500 * 1024 * 1024; // 500 MB
const MAX_FILE_SIZE_VIDEO = 2 * 1024 * 1024 * 1024; // 2 GB

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

export async function POST(request: NextRequest): Promise<Response> {
  const auth = verifyRequestAuth(request);

  if (!auth) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log('[blob-upload] onBeforeGenerateToken called');

        // Extract file info from clientPayload
        const payload = typeof clientPayload === 'string'
          ? JSON.parse(clientPayload)
          : clientPayload;

        const fileSize = payload?.size || 0;
        const fileType = payload?.type || '';
        const filename = payload?.filename || 'unknown';
        const language = payload?.language || 'auto'; // Default language

        console.log('[blob-upload] File info:', { size: fileSize, type: fileType, filename, language });

        // Validate file type
        const isAudioAllowed = ALLOWED_AUDIO_TYPES.includes(fileType);
        const isVideoAllowed = ALLOWED_VIDEO_TYPES.includes(fileType);

        if (!isAudioAllowed && !isVideoAllowed) {
          throw new Error(
            'Tipo de archivo no permitido. Solo se aceptan archivos de audio (MP3, WAV, OGG, M4A) o video (MP4, WEBM, MOV).'
          );
        }

        // Validate file size
        const maxSize = isAudioAllowed ? MAX_FILE_SIZE_AUDIO : MAX_FILE_SIZE_VIDEO;
        if (fileSize > maxSize) {
          const maxSizeMB = maxSize / 1024 / 1024;
          const fileType = isAudioAllowed ? 'audio' : 'video';
          throw new Error(
            `El archivo ${fileType} es demasiado grande. Tamaño máximo: ${maxSizeMB} MB`
          );
        }

        console.log('[blob-upload] All validations passed');

        // Add userId to clientPayload for onUploadCompleted
        return {
          allowedContentTypes: [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_SIZE_VIDEO,
          clientPayload: JSON.stringify({ ...payload, userId: auth.userId }), // Pass userId to clientPayload
        };
      },
      onUploadCompleted: async ({ blob, clientPayload }) => {
        console.log('[blob-upload] Upload completed:', blob.url);

        const payload = typeof clientPayload === 'string'
          ? JSON.parse(clientPayload)
          : clientPayload;

        const userId = payload?.userId;
        const filename = payload?.filename || 'unknown';
        const language = payload?.language || 'auto';
        const audioSizeBytes = payload?.size || 0;

        if (!userId) {
          console.error('[blob-upload] userId not found in clientPayload after upload completion.');
          return; // Or throw an error, depending on desired behavior
        }

        try {
          await TranscriptionJobDB.create(
            userId,
            filename,
            blob.url,
            language,
            audioSizeBytes
          );
          console.log(`[blob-upload] Transcription job created for user ${userId} with audio URL: ${blob.url}`);
        } catch (dbError) {
          console.error('[blob-upload] Error saving transcription job to DB:', dbError);
        }
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error('[blob-upload] Error:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
