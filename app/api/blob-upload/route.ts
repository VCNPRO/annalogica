import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validación opcional de autenticación
        // const token = request.headers.get('Authorization');
        // if (!token) throw new Error('No autorizado');

        return {
          allowedContentTypes: ['audio/*', 'video/*', 'application/*'],
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 3600,
          tokenPayload: JSON.stringify({
            userId: 'user-' + Date.now(),
            timestamp: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Callback cuando se completa la subida
        console.log('Archivo subido exitosamente:', blob.url);
        console.log('Token payload:', tokenPayload);
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error('Error en blob-upload:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}