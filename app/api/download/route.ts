import PDFDocument from 'pdfkit';

export async function POST(request: Request) {
  try {
    const { text, filename } = await request.json();
    
    const chunks: Uint8Array[] = [];
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 }});
    
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
    });
    
    // Título
    doc.fontSize(18).font('Helvetica-Bold').text('Transcripción', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(filename, { align: 'center' });
    doc.moveDown(1.5);
    
    // Contenido
    doc.fontSize(11).font('Helvetica').fillColor('#000');
    const paragraphs = text.split(/\n\n+/).filter((p: string) => p.trim());
    
    paragraphs.forEach((para: string, i: number) => {
      doc.text(para.trim(), { align: 'justify', lineGap: 4 });
      if (i < paragraphs.length - 1) doc.moveDown(0.8);
    });
    
    doc.end();
    
    const pdfBuffer = await pdfPromise;
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`
      }
    });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
