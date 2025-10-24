// lib/excel-generator.ts
// Generador de archivos Excel estructurados con columnas de datos
import ExcelJS from 'exceljs';

export interface AudioExcelData {
  clientId?: number; // ID corto de 4 cifras del cliente
  filename: string;
  duration?: number;
  transcription: string;
  summary?: string;
  speakers?: Array<{ name: string; role: string }>;
  tags?: string[];
  hasSRT: boolean;
  hasVTT: boolean;
  language?: string;
  processingDate: Date;
}

export interface DocumentExcelData {
  clientId?: number; // ID corto de 4 cifras del cliente
  filename: string;
  title?: string;
  documentType: string; // PDF, DOCX, TXT
  pageCount?: number;
  extractedText: string;
  summary?: string;
  tags?: string[];
  language?: string;
  processingDate: Date;
}

/**
 * Generar Excel para transcripción de AUDIO
 */
export async function generateAudioExcel(data: AudioExcelData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transcripción Audio');

  // Configurar columnas
  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 25 },
    { header: 'Valor', key: 'value', width: 80 }
  ];

  // Estilo del encabezado
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Agregar datos
  const rows = [
    ['ID Cliente', data.clientId ? data.clientId.toString() : 'N/A'],
    ['Nombre de Archivo', data.filename],
    ['Duración (segundos)', data.duration?.toString() || 'N/A'],
    ['Duración (minutos)', data.duration ? `${(data.duration / 60).toFixed(2)} min` : 'N/A'],
    ['Idioma', data.language || 'Español'],
    ['Fecha de Procesamiento', data.processingDate.toLocaleString('es-ES')],
    ['', ''], // Separador
    ['TRANSCRIPCIÓN COMPLETA', ''],
    ['Texto', data.transcription],
    ['', ''], // Separador
  ];

  // Agregar resumen si existe
  if (data.summary) {
    rows.push(['RESUMEN', '']);
    rows.push(['Texto', data.summary]);
    rows.push(['', '']); // Separador
  }

  // Agregar speakers si existen
  if (data.speakers && data.speakers.length > 0) {
    rows.push(['INTERVINIENTES/HABLANTES', '']);
    data.speakers.forEach((speaker, index) => {
      rows.push([`Hablante ${index + 1}`, `${speaker.name} - ${speaker.role}`]);
    });
    rows.push(['', '']); // Separador
  }

  // Agregar tags si existen
  if (data.tags && data.tags.length > 0) {
    rows.push(['ETIQUETAS (TAGS)', '']);
    rows.push(['Tags', data.tags.join(', ')]);
    rows.push(['', '']); // Separador
  }

  // Archivos de subtítulos
  rows.push(['ARCHIVOS DE SUBTÍTULOS', '']);
  rows.push(['SRT (SubRip)', data.hasSRT ? 'Sí - Archivo separado .srt' : 'No']);
  rows.push(['VTT (WebVTT)', data.hasVTT ? 'Sí - Archivo separado .vtt' : 'No']);

  // Agregar todas las filas
  rows.forEach(row => {
    const addedRow = worksheet.addRow({ field: row[0], value: row[1] });

    // Estilo para encabezados de sección
    if (row[0] && !row[1] && row[0].length > 0) {
      addedRow.font = { bold: true, size: 11, color: { argb: 'FF2E75B5' } };
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' }
      };
    }
  });

  // Ajustar texto en las celdas largas
  worksheet.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
  worksheet.getColumn('field').alignment = { vertical: 'top' };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generar Excel para DOCUMENTO (PDF/DOCX/TXT)
 */
export async function generateDocumentExcel(data: DocumentExcelData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Documento Procesado');

  // Configurar columnas
  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 25 },
    { header: 'Valor', key: 'value', width: 80 }
  ];

  // Estilo del encabezado
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Agregar datos
  const rows = [
    ['ID Cliente', data.clientId ? data.clientId.toString() : 'N/A'],
    ['Nombre de Archivo', data.filename],
    ['Título del Documento', data.title || 'N/A'],
    ['Tipo de Documento', data.documentType.toUpperCase()],
    ['Número de Páginas', data.pageCount?.toString() || 'N/A'],
    ['Idioma', data.language || 'Español'],
    ['Fecha de Procesamiento', data.processingDate.toLocaleString('es-ES')],
    ['', ''], // Separador
  ];

  // Texto extraído
  rows.push(['TEXTO EXTRAÍDO', '']);
  rows.push(['Contenido Completo', data.extractedText]);
  rows.push(['', '']); // Separador

  // Resumen si existe
  if (data.summary) {
    rows.push(['RESUMEN', '']);
    rows.push(['Texto', data.summary]);
    rows.push(['', '']); // Separador
  }

  // Tags si existen
  if (data.tags && data.tags.length > 0) {
    rows.push(['ETIQUETAS (TAGS)', '']);
    rows.push(['Tags', data.tags.join(', ')]);
  }

  // Agregar todas las filas
  rows.forEach(row => {
    const addedRow = worksheet.addRow({ field: row[0], value: row[1] });

    // Estilo para encabezados de sección
    if (row[0] && !row[1] && row[0].length > 0) {
      addedRow.font = { bold: true, size: 11, color: { argb: 'FF548235' } };
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
      };
    }
  });

  // Ajustar texto en las celdas largas
  worksheet.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
  worksheet.getColumn('field').alignment = { vertical: 'top' };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
