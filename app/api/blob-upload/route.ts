// app/api/blob-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import { inngest } from '@/lib/inngest/client'; // 👈 CORREGIDO (singular)
import { sql } from '@vercel/postgres';

// Tamaños máximos (bytes)
// 🔥 LÍMITES OPTIMIZADOS PARA PRO: Soportan hasta 2GB (Límite Deepgram/Vercel Blob)
const MAX_FILE_SIZE_AUDIO = 2 * 1024 * 1024 * 1024;    // 2 GB
const MAX_FILE_SIZE_VIDEO = 2 * 1024 * 1024 * 1024;    // 2 GB
const MAX_FILE_SIZE_DOCUMENT = 100 * 1024 * 1024;      // 100 MB

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

// Helper function to get user's preferred language
async function getUserPreferredLanguage(userId: string): Promise<string> {
  try {
    const result = await sql`
      SELECT preferred_language
      FROM users
      WHERE id = ${userId}
    `;

    if (result.rows.length > 0 && result.rows[0].preferred_language) {
      return result.rows[0].preferred_language;
    }
  } catch (error) {
    console.error('[blob-upload] Error fetching user preferred_language:', error);
  }

  return 'auto'; // Default fallback
}

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

      onBeforeGenerateToken: async (_pathname, clientPayload, _multipart) => {
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
          maximumSizeInBytes: Math.max(
            MAX_FILE_SIZE_AUDIO,
            MAX_FILE_SIZE_VIDEO,
            MAX_FILE_SIZE_DOCUMENT
          ),
          // Pasamos info necesaria para onUploadCompleted
          clientPayload: JSON.stringify({
            filename,
            type: fileType,
            size: fileSize,
            language,
            userId: auth.userId,
            // Opcional: si tu UI manda acciones/tipo de resumen, viajan aquí
            actions: Array.isArray(payload?.actions) ? payload.actions : undefined,
            summaryType: payload?.summaryType,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[blob-upload] onUploadCompleted', { url: blob.url });

        const payload =
          typeof tokenPayload === 'string' ? safeJsonParse(tokenPayload) : tokenPayload ?? {};

        const userId = payload?.userId as string | undefined;
        const filename = String(payload?.filename ?? 'unknown');
        let language = String(payload?.language ?? 'auto');

        // Usamos los valores enviados en clientPayload
        const fileSizeBytes = Number(payload?.size ?? 0);
        const fileType = String(payload?.type ?? '').toLowerCase();
        const actions = Array.isArray(payload?.actions) ? payload.actions : [];
        const summaryType = payload?.summaryType;

        if (!userId) {
          console.error('[blob-upload] Falta userId en tokenPayload');
          return;
        }

        // If language is 'auto', try to get user's preferred language
        if (language === 'auto') {
          const preferredLanguage = await getUserPreferredLanguage(userId);
          if (preferredLanguage && preferredLanguage !== 'auto') {
            language = preferredLanguage;
            console.log('[blob-upload] Using user preferred language:', language);
          }
        }

        try {
          // ✅ SIMPLEMENTE LOGEA QUE EL ARCHIVO SE SUBIÓ
          // El procesamiento se hace cuando el usuario hace clic en "Procesar Archivos"
          // que llama a /api/process o /api/process-document
          console.log('[blob-upload] ✅ Archivo subido correctamente a Blob:', {
            userId,
            filename,
            url: blob.url,
            fileType,
            size: fileSizeBytes,
            language
          });

          // NO creamos job aquí - se crea cuando el usuario hace clic en "Procesar"
          // Esto evita crear jobs que nunca se procesan si el usuario cancela

        } catch (error) {
          console.error('[blob-upload] Error en onUploadCompleted:', error);
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
