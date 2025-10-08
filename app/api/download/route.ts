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

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      doc.fontSize(16).text('TRANSCRIPCIÓN DE AUDIO', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text('='.repeat(80));
      doc.moveDown();

      doc.fontSize(11).text('Archivo: ' + filename);
      doc.text('Fecha: ' + new Date().toLocaleDateString('es-ES'));
      doc.text('Hora: ' + new Date().toLocaleTimeString('es-ES'));

      doc.moveDown();
      doc.text('='.repeat(80));
      doc.moveDown();

      doc.fontSize(10).text('CONTENIDO:', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(text, { align: 'left' });
      doc.moveDown(2);

      doc.text('='.repeat(80));
      doc.fontSize(9).text('Generado por Annalogica', { align: 'center' });

      doc.end();

      const pdfBuffer = await pdfPromise;

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="' + filename.replace(/\.[^/.]+$/, '') + '-transcripcion.pdf"',
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

    } catch (error: any) {
      console.error('Error generando PDF:', error);
      return Response.json({ error: 'Error generando PDF: ' + error.message }, { status: 500 });
    }
  }
