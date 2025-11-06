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
 * Fetch document from URL and parse with retry logic
 *
 * Vercel Blob uses a CDN with eventual consistency, which means files
 * may not be immediately available after upload. This function retries
 * with exponential backoff to handle this.
 */
export async function parseDocumentFromURL(
  url: string,
  filename: string
): Promise<ParseResult> {
  console.log(`[DocumentParser] Fetching document from URL: ${url}`);

  const MAX_RETRIES = 5;
  const INITIAL_DELAY = 1000; // 1 second
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add delay before retries (exponential backoff)
      if (attempt > 0) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
        console.log(`[DocumentParser] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Fetch with proper error handling
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Annalogica Document Parser'
        }
      });

      // Check response status FIRST
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');

        // If it's a 404, it might be due to CDN propagation delay - retry
        if (response.status === 404 && attempt < MAX_RETRIES) {
          console.warn(`[DocumentParser] 404 on attempt ${attempt + 1}/${MAX_RETRIES + 1} - file may not be propagated to CDN yet`);
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          continue; // Retry
        }

        console.error(`[DocumentParser] HTTP Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verify content type
      const contentType = response.headers.get('content-type') || '';
      console.log(`[DocumentParser] Response content-type: ${contentType}, size: ${response.headers.get('content-length') || 'unknown'}`);

      // Get response as arrayBuffer with validation
      let arrayBuffer: ArrayBuffer;
      try {
        const rawArrayBuffer = await response.arrayBuffer();

        // Validate that it's actually an ArrayBuffer
        if (!(rawArrayBuffer instanceof ArrayBuffer)) {
          console.error('[DocumentParser] Response is not an ArrayBuffer:', {
            type: typeof rawArrayBuffer,
            constructor: rawArrayBuffer?.constructor?.name,
            isArrayBuffer: rawArrayBuffer instanceof ArrayBuffer
          });
          throw new Error(`Expected ArrayBuffer, got ${typeof rawArrayBuffer}`);
        }

        arrayBuffer = rawArrayBuffer;

        // Check if empty
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Downloaded file is empty (0 bytes)');
        }

      } catch (arrayBufferError: any) {
        console.error('[DocumentParser] Failed to get arrayBuffer:', arrayBufferError);
        throw new Error(`Error al descargar documento: ${arrayBufferError.message}`);
      }

      // Convert ArrayBuffer to Node.js Buffer
      let buffer: Buffer;
      try {
        buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) {
          throw new Error('Buffer conversion resulted in 0 bytes');
        }

        console.log(`[DocumentParser] ✅ Downloaded ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB) on attempt ${attempt + 1}`);

      } catch (conversionError: any) {
        console.error('[DocumentParser] Buffer conversion failed:', {
          arrayBufferByteLength: arrayBuffer?.byteLength,
          error: conversionError.message
        });
        throw new Error(`No se pudo convertir a Buffer: ${conversionError.message}`);
      }

      // Success! Parse and return
      return await parseDocument(buffer, filename);

    } catch (error: any) {
      // Store the error for potential retry or final throw
      lastError = error;

      // If it's a retryable error and we have attempts left, continue loop
      if (attempt < MAX_RETRIES && error.message?.includes('404')) {
        console.warn(`[DocumentParser] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed with 404, will retry...`);
        continue;
      }

      // Otherwise, throw immediately (don't retry non-404 errors)
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

  // If we exhausted all retries, throw the last error
  console.error(`[DocumentParser] ❌ All ${MAX_RETRIES + 1} attempts failed`);
  const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw {
    error: `Error descargando documento después de ${MAX_RETRIES + 1} intentos: ${finalErrorMessage}`,
    attemptedMethods: ['fetch-with-retry'],
    suggestions: [
      'El archivo puede no estar disponible en Vercel Blob CDN',
      'Intenta subir el archivo nuevamente',
      'Verifica que la URL sea correcta',
      'Puede haber un problema temporal con Vercel Blob'
    ]
  } as ParseError;
}
