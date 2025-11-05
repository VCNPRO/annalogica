/**
 * Document Parser - Robust server-side text extraction
 *
 * Supports: PDF, DOCX, TXT
 * Features:
 * - Serverless-optimized PDF parsing (unpdf - no native dependencies)
 * - DOCX processing with mammoth
 * - UTF-8/Latin1 text file support
 * - Professional error handling
 * - Detailed logging
 */

import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export interface ParseResult {
  text: string;
  metadata: {
    method: 'unpdf' | 'mammoth' | 'plain-text';
    pages?: number;
    processingTime: number;
    fileSize: number;
    warnings?: string[];
  };
}

export interface ParseError {
  error: string;
  attemptedMethods: string[];
  suggestions: string[];
}

/**
 * Parse PDF using unpdf (serverless-optimized, no native dependencies)
 */
async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    console.log('[DocumentParser] PDF: Extracting text with unpdf (serverless-optimized)...');

    // Convert Buffer to Uint8Array as required by unpdf
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array, {
      // Options for better text extraction
      mergePages: true
    });

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('El PDF está vacío o no contiene texto extraíble');
    }

    const processingTime = Date.now() - startTime;
    console.log(`[DocumentParser] ✅ unpdf succeeded: ${result.text.length} chars, ${result.totalPages} pages in ${processingTime}ms`);

    return {
      text: result.text,
      metadata: {
        method: 'unpdf',
        pages: result.totalPages,
        processingTime,
        fileSize: buffer.length
      }
    };

  } catch (error: any) {
    console.error('[DocumentParser] unpdf failed:', error);
    throw {
      error: `Error al procesar PDF: ${error.message}`,
      attemptedMethods: ['unpdf'],
      suggestions: [
        'El PDF puede estar protegido con contraseña',
        'El PDF puede estar completamente escaneado (imagen sin capa de texto)',
        'El PDF puede estar corrupto o dañado',
        'Intenta convertir el PDF a TXT o DOCX usando Adobe Acrobat o Google Drive',
        'Usa herramientas online: https://www.ilovepdf.com/pdf_to_text'
      ]
    } as ParseError;
  }
}

/**
 * Parse DOCX document
 */
async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    console.log('[DocumentParser] DOCX: Extracting text with mammoth...');
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('El documento DOCX está vacío o no contiene texto');
    }

    const processingTime = Date.now() - startTime;
    const warnings = result.messages.length > 0
      ? result.messages.map(m => m.message)
      : undefined;

    console.log(`[DocumentParser] ✅ DOCX parsed: ${result.value.length} chars in ${processingTime}ms`);

    return {
      text: result.value,
      metadata: {
        method: 'mammoth',
        processingTime,
        fileSize: buffer.length,
        warnings
      }
    };
  } catch (error: any) {
    console.error('[DocumentParser] DOCX parsing failed:', error);
    throw {
      error: `Error al procesar documento Word: ${error.message}`,
      attemptedMethods: ['mammoth'],
      suggestions: [
        'El archivo puede estar corrupto',
        'Intenta abrir el documento y guardarlo como .docx nuevamente',
        'Convierte a TXT: Abre el documento → Archivo → Guardar como → Texto plano (.txt)'
      ]
    } as ParseError;
  }
}

/**
 * Parse plain text file
 */
async function parseTXT(buffer: Buffer): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    console.log('[DocumentParser] TXT: Reading plain text...');

    // Try UTF-8 first
    let text = buffer.toString('utf-8');

    // Check if valid UTF-8 (no replacement characters)
    if (text.includes('\uFFFD')) {
      console.warn('[DocumentParser] TXT: Invalid UTF-8 detected, trying latin1...');
      text = buffer.toString('latin1');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('El archivo de texto está vacío');
    }

    const processingTime = Date.now() - startTime;

    console.log(`[DocumentParser] ✅ TXT parsed: ${text.length} chars in ${processingTime}ms`);

    return {
      text,
      metadata: {
        method: 'plain-text',
        processingTime,
        fileSize: buffer.length
      }
    };
  } catch (error: any) {
    console.error('[DocumentParser] TXT parsing failed:', error);
    throw {
      error: `Error al leer archivo de texto: ${error.message}`,
      attemptedMethods: ['utf-8', 'latin1'],
      suggestions: [
        'El archivo puede tener una codificación no soportada',
        'Intenta abrir el archivo en un editor de texto y guardarlo como UTF-8'
      ]
    } as ParseError;
  }
}

/**
 * Main document parser - auto-detects format and extracts text
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  console.log(`[DocumentParser] Starting to parse: ${filename} (${buffer.length} bytes)`);

  // Detect file type
  const ext = filename.toLowerCase().split('.').pop();

  try {
    switch (ext) {
      case 'pdf':
        return await parsePDF(buffer);

      case 'docx':
        return await parseDOCX(buffer);

      case 'txt':
        return await parseTXT(buffer);

      default:
        throw {
          error: `Tipo de archivo no soportado: .${ext}`,
          attemptedMethods: [],
          suggestions: [
            'Solo se aceptan archivos: PDF, DOCX, TXT',
            'Convierte tu archivo a uno de estos formatos'
          ]
        } as ParseError;
    }
  } catch (error: any) {
    // If it's already a ParseError, rethrow it
    if (error.attemptedMethods) {
      throw error;
    }

    // Otherwise, wrap it
    throw {
      error: `Error inesperado procesando ${filename}: ${error.message}`,
      attemptedMethods: ['auto-detect'],
      suggestions: [
        'Verifica que el archivo no esté corrupto',
        'Intenta convertir a un formato diferente (TXT es el más confiable)'
      ]
    } as ParseError;
  }
}

/**
 * Fetch document from URL and parse
 */
export async function parseDocumentFromURL(
  url: string,
  filename: string
): Promise<ParseResult> {
  console.log(`[DocumentParser] Fetching document from URL: ${url}`);

  try {
    // Fetch with proper error handling
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Annalogica Document Parser'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error(`[DocumentParser] HTTP Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get response as arrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Convert to Buffer with proper handling
    let buffer: Buffer;
    try {
      if (arrayBuffer instanceof ArrayBuffer) {
        buffer = Buffer.from(arrayBuffer);
      } else if (Buffer.isBuffer(arrayBuffer)) {
        buffer = arrayBuffer;
      } else if (arrayBuffer && typeof arrayBuffer === 'object') {
        // Handle case where arrayBuffer might be a Uint8Array or similar
        buffer = Buffer.from(arrayBuffer as any);
      } else {
        throw new Error(`Invalid response type: ${typeof arrayBuffer}`);
      }
    } catch (conversionError: any) {
      console.error('[DocumentParser] Buffer conversion error:', {
        type: typeof arrayBuffer,
        isArrayBuffer: arrayBuffer instanceof ArrayBuffer,
        isBuffer: Buffer.isBuffer(arrayBuffer),
        constructor: arrayBuffer?.constructor?.name,
        error: conversionError.message
      });
      throw new Error(`No se pudo convertir la respuesta a Buffer: ${conversionError.message}`);
    }

    console.log(`[DocumentParser] ✅ Downloaded ${buffer.length} bytes`);

    return await parseDocument(buffer, filename);

  } catch (error: any) {
    // Extract error message properly
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.cause) {
      errorMessage = String(error.cause);
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    }

    console.error('[DocumentParser] ❌ Failed to fetch document:', errorMessage);
    console.error('[DocumentParser] Full error object:', error);
    console.error('[DocumentParser] Error type:', typeof error);
    console.error('[DocumentParser] Error keys:', error ? Object.keys(error) : 'none');

    throw {
      error: `Error descargando documento: ${errorMessage}`,
      attemptedMethods: ['fetch'],
      suggestions: [
        'Verifica que la URL sea válida y accesible',
        'El archivo puede haber sido eliminado de Vercel Blob',
        'Puede haber un problema de conectividad de red'
      ]
    } as ParseError;
  }
}
