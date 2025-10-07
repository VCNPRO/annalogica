import PDFDocument from 'pdfkit';

export async function GET() {
  return Response.json({ error: 'Use POST method' }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const { text, filename } = await request.json();

    if (!text || !filename) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Create PDF using PDFKit
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Buffer to collect PDF chunks
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Add header
    doc.fontSize(16).font('Helvetica-Bold').text('TRANSCRIPCIÓN DE AUDIO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text('='.repeat(80));
    doc.moveDown();

    // Add metadata
    doc.fontSize(11).text(`Archivo: ${filename}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`);
    doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`);
    doc.moveDown();
    doc.text('='.repeat(80));
    doc.moveDown();

    // Add content
    doc.fontSize(10).text('CONTENIDO:', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(text, { align: 'left' });
    doc.moveDown(2);

    // Add footer
    doc.text('='.repeat(80));
    doc.fontSize(9).text('Generado por Annalogica', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation
    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/\.[^/.]+$/, '')}-transcripcion.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    return Response.json({ error: 'Error generando PDF: ' + error.message }, { status: 500 });
  }
}