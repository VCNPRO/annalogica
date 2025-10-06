import { list, del } from '@vercel/blob';
import { verifyRequestAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { blobs } = await list();
    
    // Agrupar por transcripción
    const grouped: any = {};
    blobs.forEach(blob => {
      const filename = blob.pathname;
      if (filename.endsWith('.txt') && !filename.includes('summary')) {
        const baseName = filename.replace('.txt', '');
        grouped[baseName] = {
          name: baseName,
          date: blob.uploadedAt,
          txtUrl: blob.url,
          srtUrl: blobs.find(b => b.pathname === `${baseName}.srt`)?.url,
          summaryUrl: blobs.find(b => b.pathname === `${baseName}-summary.txt`)?.url,
          audioUrl: blobs.find(b => b.pathname.startsWith(baseName) && !b.pathname.includes('.txt') && !b.pathname.includes('.srt'))?.url
        };
      }
    });
    
    const files = Object.values(grouped);
    return Response.json({ files });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { filename } = await request.json();
    const { blobs } = await list();
    
    // Eliminar todos los archivos relacionados
    const toDelete = blobs.filter(b => b.pathname.startsWith(filename));
    await Promise.all(toDelete.map(b => del(b.url)));
    
    return Response.json({ success: true });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
