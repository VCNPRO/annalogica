 import PDFDocument from 'pdfkit';

  export async function GET() {
    return Response.json({ error: 'Use POST method' }, { status: 405 });
  }


  export async function POST(request: Request) {
    try {
      const { text, filename } = await request.json();


      // --- INICIO DE LOGS PARA DEPURACIÓN ---
      console.log('PDF Generation: Received request.');
      console.log('PDF Generation: Filename:', filename);
      console.log('PDF Generation: Text length:', text ? text.length : 'undefined or null');
      console.log('PDF Generation: Text snippet:', text ? text.substring(0, 100) + '...' : 'No text received.');
      // --- FIN DE LOGS PARA DEPURACIÓN ---


      if (!text || !filename) {
        console.error('PDF Generation: Missing required data (text or filename).');
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

      console.log('PDF Generation: Successfully created PDF buffer. Size:', pdfBuffer.length);


      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="' + filename.replace(/\.[^/.]+$/, '') + '-transcripcion.pdf"',
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });


    } catch (error: any) {
      console.error('PDF Generation: Critical error:', error);
      return Response.json({ error: 'Error generando PDF: ' + error.message }, { status: 500 });
    }
  }
