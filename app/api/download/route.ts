export async function POST(request: Request) {
  try {
    const { text, filename } = await request.json();

    if (!text || !filename) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Limpiar y formatear el texto
    const cleanText = text.replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, '').trim();
    const lines = cleanText.split('\n').filter(line => line.trim());

    // Crear un PDF más robusto
    const generatePDFContent = () => {
      const header = `TRANSCRIPCIÓN DE AUDIO

Archivo: ${filename}
Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}

${'='.repeat(60)}

`;

      const formattedText = lines.map((line, index) => {
        // Dividir líneas largas en chunks de 80 caracteres
        const chunks = [];
        let currentLine = line.trim();

        while (currentLine.length > 80) {
          let splitIndex = 80;
          // Buscar el último espacio antes de 80 caracteres
          const lastSpace = currentLine.lastIndexOf(' ', 80);
          if (lastSpace > 60) {
            splitIndex = lastSpace;
          }

          chunks.push(currentLine.substring(0, splitIndex));
          currentLine = currentLine.substring(splitIndex).trim();
        }

        if (currentLine.length > 0) {
          chunks.push(currentLine);
        }

        return chunks.join('\n');
      }).join('\n\n');

      return header + formattedText;
    };

    const fullContent = generatePDFContent();

    // Generar PDF manual mejorado
    const pdfLines = fullContent.split('\n');
    const textCommands = [];
    let yPosition = 750;

    // Añadir cada línea
    pdfLines.forEach((line, index) => {
      if (yPosition < 50) {
        // Nueva página si nos quedamos sin espacio
        yPosition = 750;
        textCommands.push('ET\nBT\n/F1 11 Tf\n50 750 Td');
      }

      const escapedLine = line.replace(/[()\\]/g, '\\$&').substring(0, 75);
      textCommands.push(`(${escapedLine}) Tj\n0 -15 Td`);
      yPosition -= 15;
    });

    const streamContent = `BT
/F1 11 Tf
50 750 Td
${textCommands.join('\n')}
ET`;

    const pdfTemplate = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length ${streamContent.length}
>>
stream
${streamContent}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000079 00000 n
0000000136 00000 n
0000000271 00000 n
0000000400 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
500
%%EOF`;

    const pdfBuffer = Buffer.from(pdfTemplate, 'binary');

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

    // Fallback robusto: archivo de texto formateado
    const { text, filename } = await request.json();
    const cleanFilename = filename?.replace(/\.[^/.]+$/, '') || 'transcripcion';

    const textContent = `TRANSCRIPCIÓN DE AUDIO
${'='.repeat(50)}

Archivo: ${filename || 'Sin nombre'}
Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}

CONTENIDO:
${'='.repeat(50)}

${text || 'Sin contenido disponible'}

${'='.repeat(50)}
Generado por Annalogica
`;

    return new Response(textContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanFilename}-transcripcion.txt"`
      }
    });
  }
}
