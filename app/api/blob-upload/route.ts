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
  // Autenticación (ajusta a tu lógica)
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
    // IMPORTANTÍSIMO: devolvemos la Response de handleUpload TAL CUAL
    return await handleUpload({
      request,
      body,

      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Normalizamos el payload del cliente (ahí suele venir size/type/filename/language)
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
            'Tipo de archivo no permitido. Solo audio (MP3/WAV/OGG/M4A), vídeo (MP4/WEBM/MOV/AVI) o documentos (TXT/PDF/DOCX).'
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

        // Construimos lista total de tipos aceptados
        const allowedContentTypes = [
          ...ALLOWED_AUDIO_TYPES,
          ...ALLOWED_VIDEO_TYPES,
          ...ALLOWED_DOCUMENT_TYPES,
        ];

        // OJO: devolvemos el token config; máximo por seguridad: el mayor límite
        return {
          allowedContentTypes,
          addRandomSuffix: true,
          maximumSizeInBytes: Math.max(
            MAX_FILE_SIZE_AUDIO,
            MAX_FILE_SIZE_VIDEO,
            MAX_FILE_SIZE_DOCUMENT
          ),
          // Guardamos info necesaria para onUploadCompleted
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
        console.log('[blob-upload] onUploadCompleted', { url: blob.url, size: blob.size, type: blob.contentType });

        const payload =
          typeof tokenPayload === 'string' ? safeJsonParse(tokenPayload) : tokenPayload ?? {};

        const userId = payload?.userId as string | undefined;
        const filename = String(payload?.filename ?? 'unknown');
        const language = String(payload?.language ?? 'auto');
        const fileSizeBytes = Number(payload?.size ?? blob.size ?? 0);
        const fileType = String(payload?.type ?? blob.contentType ?? '').toLowerCase();

        if (!userId) {
          console.error('[blob-upload] Falta userId en tokenPayload');
          return; // si prefieres, lanza error para bloquear el flujo
        }

        try {
          // Creamos SIEMPRE un "job" de transcripción/ingesta; MP4/MP3 se transcriben por URL.
          // Si es documento, tu pipeline de documentos lo consumirá igual desde la URL.
          await TranscriptionJobDB.create(
            userId,
            filename,
            blob.url,        // URL segura del Blob (se transcribe/parsea por URL)
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
  } catch (error: any) {
    console.error('[blob-upload] Error:', error?.message ?? error);
    // handleUpload ya devuelve respuestas adecuadas; aquí solo errores “externos”
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
