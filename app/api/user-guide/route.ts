import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // Leer el PDF estático generado
    const pdfPath = path.join(process.cwd(), 'public', 'guia-usuario-annalogica.pdf');

    // Verificar que existe el archivo
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        {
          error: 'PDF no disponible',
          message: 'La guía de usuario está disponible en formato web en /guia. Usa la función "Imprimir a PDF" de tu navegador para descargarla.',
          webGuideUrl: '/guia'
        },
        { status: 404 }
      );
    }

    // Leer el archivo
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Devolver el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="guia-usuario-annalogica.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
      }
    });

  } catch (error) {
    console.error('Error sirviendo guía de usuario:', error);
    return NextResponse.json(
      {
        error: 'Error al servir la guía de usuario',
        message: 'Visita /guia para la versión web',
        webGuideUrl: '/guia'
      },
      { status: 500 }
    );
  }
}
