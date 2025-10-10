import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: Request): Promise<Response> {
  console.log('[blob-upload-test] Received request');
  console.log('[blob-upload-test] BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[blob-upload-test] onBeforeGenerateToken called for:', pathname);

        return {
          allowedContentTypes: ['audio/*', 'video/*'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[blob-upload-test] Upload completed:', blob.url);
      },
    });

    console.log('[blob-upload-test] Success, returning response');
    return Response.json(jsonResponse);
  } catch (error) {
    console.error('[blob-upload-test] Error:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
