// app/api/blob-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

// Tamaños máximos (bytes)
const MAX_FILE_SIZE_AUDIO = 500 * 1024 * 1024;      // 500 MB
const MAX_FILE_SIZE_VIDEO = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_FILE_SIZE_DOCUMENT = 50 * 1024 * 1024;    // 50 MB

// Tipos permitidos
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
  'video/quicktime',   // .mov
  'video/x-msvideo',   // .avi
];

const ALLOWED_DOCUMENT_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

export async function POST(request: NextRequest): Promise<Response> {
  // Autenticación
  const auth = verifyRequestAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  try {
    // handleUpload devuelve un objeto (no Response); lo convertimos a JSON
    const result = await handleUpload({
      request,
      body,

      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload =
          typeof clientPayload === 'string' ? safeJsonParse(clientPayload) : clientPayload ?? {};

        const fileSize = Number(payload?.size ?? 0);
        const fileType = String(payload?.type ?? '').toLowerCase();
        const filename = String(payload?.filename ?? 'unknown');
        const language = String(payload?.language ?? 'auto');

        console.log('[blob-upload] onBeforeGenerateToken', {
          filename,
          fileType,
          fileSize,
          language,
          userId: auth.userId,
        });

        // Validación de tipo
        const isAudio = ALLOWED_AUDIO_TYPES.includes(fileType);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);
        const isDocument = ALLOWED_DOCUMENT_TYPES.includes(fileType);

        if (!isAudio && !isVideo && !isDocument) {
          throw new Error(
            'Tipo no permitido. Solo audio (MP3/WAV/OGG/M4A), vídeo (MP4/WEBM/MOV/AVI) o documentos (TXT/PDF/DOCX).'
          );
        }

        // Límite por tipo
        const { maxSize, label } = isAudio
          ? { maxSize: MAX_FILE_SIZE_AUDIO, label: 'audio' }
          : isVideo
          ? { maxSize: MAX_FILE_SIZE_VIDEO, label: 'video' }
          : { maxSize: MAX_FILE_SIZE_DOCUMENT, label: 'documento' };

        if (fileSize > maxSize) {
          const maxMB = Math.floor(maxSize / 1024 / 1024);
          throw new Error(`El archivo de ${label} es demasiado grande. Límite: ${maxMB} MB`);
        }

        const allowedContentTypes = [
          ...ALLOWED_AUDIO_TYPES,
          ...ALLOWED_VIDEO_TYPES,
          ...ALLOWED_DOCUMENT_TYPES,
        ];

        return {
          allowedContentTypes,
          addRandomSuffix: true,
          // Usa el mayor límite para que el SDK pueda validar bien en cliente
          maximumSizeInBytes: Math.max(
            MAX_FILE_SIZE_AUDIO,
            MAX_FILE_SIZE_VIDEO,
            MAX_FILE_SIZE_DOCUMENT
          ),
          // Pasamos todo lo que necesitaremos en onUploadCompleted
          clientPayload: JSON.stringify({
            filename,
            type: fileType,
            size: fileSize,
            language,
            userId: auth.userId,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // OJO: algunas versiones de tipos no exponen blob.size ni blob.contentType
        console.log('[blob-upload] onUploadCompleted', { url: blob.url });

        const payload =
          typeof tokenPayload === 'string' ? safeJsonParse(tokenPayload) : tokenPayload ?? {};

        const userId = payload?.userId as string | undefined;
        const filename = String(payload?.filename ?? 'unknown');
        const language = String(payload?.language ?? 'auto');

        // Usamos SIEMPRE los valores enviados en clientPayload
        const fileSizeBytes = Number(payload?.size ?? 0);
        const fileType = String(payload?.type ?? '').toLowerCase();

        if (!userId) {
          console.error('[blob-upload] Falta userId en tokenPayload');
          return;
        }

        try {
          await TranscriptionJobDB.create(
            userId,
            filename,
            blob.url,        // URL del Blob (se procesará/transcribirá por URL)
            language,
            fileSizeBytes,
            fileType
          );
          console.log('[blob-upload] Job creado', { userId, filename, url: blob.url, fileType });
        } catch (dbError) {
          console.error('[blob-upload] Error guardando job en DB:', dbError);
        }
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[blob-upload] Error:', error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? 'Upload error' },
      { status: 400 }
    );
  }
}

/** Utilidad segura para parsear JSON sin romper la función */
function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}
