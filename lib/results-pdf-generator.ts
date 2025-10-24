// lib/results-pdf-generator.ts
// Generador de PDFs para resultados de procesamiento
import PDFDocument from 'pdfkit';

// PDFKit puede requerir buffer en entorno Node.js
if (typeof Buffer === 'undefined') {
  globalThis.Buffer = require('buffer').Buffer;
}

export interface AudioPDFData {
  clientId?: number; // ID corto de 4 cifras del cliente
  filename: string;
  duration?: number;
  transcription: string;
  summary?: string;
  speakers?: Array<{ name: string; role: string }>;
  tags?: string[];
  language?: string;
  processingDate: Date;
}

export interface DocumentPDFData {
  clientId?: number; // ID corto de 4 cifras del cliente
  filename: string;
  title?: string;
  documentType: string;
  pageCount?: number;
  extractedText: string;
  summary?: string;
  tags?: string[];
  language?: string;
  processingDate: Date;
}

/**
 * Generar PDF para transcripción de AUDIO
 */
export async function generateAudioPDF(data: AudioPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // PORTADA
    doc.fontSize(24).font('Helvetica-Bold').text('Transcripción de Audio', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').fillColor('#666666');
    doc.text(`Archivo: ${data.filename}`, { align: 'center' });
    doc.text(`Fecha: ${data.processingDate.toLocaleDateString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);

    // INFORMACIÓN GENERAL
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Información General');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    if (data.clientId) {
      addKeyValue(doc, 'ID Cliente', data.clientId.toString());
    }
    addKeyValue(doc, 'Nombre de Archivo', data.filename);
    if (data.duration) {
      addKeyValue(doc, 'Duración', `${(data.duration / 60).toFixed(2)} minutos (${data.duration} segundos)`);
    }
    addKeyValue(doc, 'Idioma', data.language || 'Español');
    addKeyValue(doc, 'Fecha de Procesamiento', data.processingDate.toLocaleString('es-ES'));
    doc.moveDown();

    // INTERVINIENTES/HABLANTES
    if (data.speakers && data.speakers.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Intervinientes/Hablantes');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      data.speakers.forEach((speaker, index) => {
        doc.text(`${index + 1}. ${speaker.name}`, { continued: true });
        doc.fillColor('#666666').text(` - ${speaker.role}`);
        doc.fillColor('#000000').moveDown(0.3);
      });
      doc.moveDown();
    }

    // ETIQUETAS
    if (data.tags && data.tags.length > 0) {
      if (data.speakers && data.speakers.length > 0) {
        // Ya estamos en la página de speakers
      } else {
        doc.addPage();
      }
      doc.fontSize(16).font('Helvetica-Bold').text('Etiquetas (Tags)');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(data.tags.join(', '), { align: 'justify' });
      doc.moveDown();
    }

    // RESUMEN
    if (data.summary) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Resumen');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(data.summary, { align: 'justify' });
      doc.moveDown();
    }

    // TRANSCRIPCIÓN COMPLETA
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Transcripción Completa');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    // Split long text into pages
    const lines = data.transcription.split('\n');
    lines.forEach(line => {
      doc.text(line, { align: 'justify' });
    });

    // NOTA SOBRE SUBTÍTULOS
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Archivos de Subtítulos');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text('Los archivos de subtítulos se encuentran en formatos separados:');
    doc.moveDown(0.3);
    doc.text('• Archivo .srt (SubRip) - Compatible con reproductores multimedia');
    doc.text('• Archivo .vtt (WebVTT) - Compatible con navegadores web');

    // Finalizar documento
    doc.end();
  });
}

/**
 * Generar PDF para DOCUMENTO (PDF/DOCX/TXT)
 */
export async function generateDocumentPDF(data: DocumentPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // PORTADA
    doc.fontSize(24).font('Helvetica-Bold').text('Documento Procesado', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').fillColor('#666666');
    doc.text(`Archivo: ${data.filename}`, { align: 'center' });
    doc.text(`Fecha: ${data.processingDate.toLocaleDateString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);

    // INFORMACIÓN GENERAL
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Información General');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    if (data.clientId) {
      addKeyValue(doc, 'ID Cliente', data.clientId.toString());
    }
    addKeyValue(doc, 'Nombre de Archivo', data.filename);
    addKeyValue(doc, 'Tipo de Documento', data.documentType.toUpperCase());
    if (data.pageCount) {
      addKeyValue(doc, 'Número de Páginas', data.pageCount.toString());
    }
    addKeyValue(doc, 'Idioma', data.language || 'Español');
    addKeyValue(doc, 'Fecha de Procesamiento', data.processingDate.toLocaleString('es-ES'));
    doc.moveDown();

    // TÍTULO
    if (data.title) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Título del Documento');
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica');
      doc.text(data.title, { align: 'center' });
      doc.moveDown();
    }

    // ETIQUETAS
    if (data.tags && data.tags.length > 0) {
      if (!data.title) doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Etiquetas (Tags)');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(data.tags.join(', '), { align: 'justify' });
      doc.moveDown();
    }

    // RESUMEN
    if (data.summary) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Resumen');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(data.summary, { align: 'justify' });
      doc.moveDown();
    }

    // TEXTO EXTRAÍDO COMPLETO
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Texto Extraído Completo');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    // Split long text into pages
    const lines = data.extractedText.split('\n');
    lines.forEach(line => {
      doc.text(line, { align: 'justify' });
    });

    // Finalizar documento
    doc.end();
  });
}

/**
 * Generar PDF para TRADUCCIÓN
 */
export interface TranslationPDFData {
  originalFilename: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  translationDate: Date;
}

export async function generateTranslationPDF(data: TranslationPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // PORTADA
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#FF6B35').text('Traducción', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').fillColor('#666666');
    doc.text(`Archivo Original: ${data.originalFilename}`, { align: 'center' });
    doc.text(`Fecha: ${data.translationDate.toLocaleDateString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);

    // INFORMACIÓN DE TRADUCCIÓN
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Información de Traducción');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    addKeyValue(doc, 'Archivo Original', data.originalFilename);
    addKeyValue(doc, 'Idioma Original', getLanguageDisplayName(data.sourceLanguage));
    addKeyValue(doc, 'Idioma Traducido', getLanguageDisplayName(data.targetLanguage));
    addKeyValue(doc, 'Fecha de Traducción', data.translationDate.toLocaleString('es-ES'));
    doc.moveDown(2);

    // TEXTO TRADUCIDO
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#FF6B35').text('Texto Traducido');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#000000');

    // Split long text into lines and handle page breaks
    const lines = data.translatedText.split('\n');
    lines.forEach(line => {
      doc.text(line || ' ', { align: 'justify' });
    });

    // FOOTER
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999999').text(
      'Generado por annalogica - Transcripción y traducción con IA',
      { align: 'center' }
    );

    // Finalizar documento
    doc.end();
  });
}

/**
 * Helper para agregar pares clave-valor formateados
 */
function addKeyValue(doc: PDFKit.PDFDocument, key: string, value: string) {
  doc.font('Helvetica-Bold').text(key + ': ', { continued: true });
  doc.font('Helvetica').text(value);
  doc.moveDown(0.3);
}

/**
 * Helper para nombres de idiomas en español
 */
function getLanguageDisplayName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'Inglés',
    'es': 'Español',
    'ca': 'Catalán',
    'eu': 'Euskera',
    'gl': 'Gallego',
    'pt': 'Portugués',
    'fr': 'Francés',
    'de': 'Alemán',
    'it': 'Italiano',
    'zh': 'Chino',
    'ja': 'Japonés',
    'ko': 'Coreano',
    'ar': 'Árabe',
    'ru': 'Ruso',
    'auto': 'Detección Automática'
  };
  return languages[code] || code.toUpperCase();
}
