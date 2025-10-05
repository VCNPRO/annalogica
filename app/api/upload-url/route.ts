import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 });
    
    // Generar URL temporal para upload directo desde frontend
    const blob = await put(filename, new Blob([]), { 
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN 
    });
    
    return Response.json({ 
      uploadUrl: blob.url,
      blobUrl: blob.url
    });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
