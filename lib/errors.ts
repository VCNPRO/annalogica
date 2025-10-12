/**
 * Centralized error handling for Annalogica
 * Provides type-safe error classes and parsing utilities
 */

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      details: this.details,
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'No autorizado', details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Authorization/Quota errors (403)
 */
export class QuotaExceededError extends AppError {
  constructor(
    message: string,
    public quota: number,
    public usage: number,
    public resetDate: Date | null
  ) {
    super(message, 'QUOTA_EXCEEDED', 403, {
      quota,
      usage,
      remaining: Math.max(0, quota - usage),
      resetDate: resetDate?.toISOString(),
    });
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id
      ? `${resource} con ID ${id} no encontrado`
      : `${resource} no encontrado`;
    super(message, 'NOT_FOUND', 404, { resource, id });
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

/**
 * External service errors (502/503)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: unknown) {
    super(
      `Error al comunicarse con ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      {
        service,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
      }
    );
  }
}

/**
 * Processing errors (500)
 */
export class ProcessingError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PROCESSING_ERROR', 500, details);
  }
}

/**
 * Database errors (500)
 */
export class DatabaseError extends AppError {
  constructor(operation: string, originalError?: unknown) {
    super(
      `Error en operación de base de datos: ${operation}`,
      'DATABASE_ERROR',
      500,
      {
        operation,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
      }
    );
  }
}

// ============================================================================
// Error Parsing & Info
// ============================================================================

export interface ErrorInfo {
  code: string;
  userMessage: string;
  httpStatus: number;
  type: string;
  details?: Record<string, any>;
}

/**
 * Parse any error into a standardized ErrorInfo object
 */
export function parseError(error: unknown): ErrorInfo {
  // AppError and subclasses
  if (error instanceof AppError) {
    return {
      code: error.code,
      userMessage: error.message,
      httpStatus: error.httpStatus,
      type: error.name,
      details: error.details,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        userMessage: 'La operación tardó demasiado tiempo. Por favor, inténtalo de nuevo.',
        httpStatus: 504,
        type: 'TimeoutError',
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        userMessage: 'Error de conexión. Verifica tu conexión a internet.',
        httpStatus: 503,
        type: 'NetworkError',
      };
    }

    if (error.name === 'AbortError') {
      return {
        code: 'REQUEST_ABORTED',
        userMessage: 'La solicitud fue cancelada.',
        httpStatus: 499,
        type: 'AbortError',
      };
    }

    // Generic Error
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: error.message || 'Ha ocurrido un error inesperado',
      httpStatus: 500,
      type: error.name || 'Error',
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: error,
      httpStatus: 500,
      type: 'StringError',
    };
  }

  // Unknown error type
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: 'Ha ocurrido un error inesperado',
    httpStatus: 500,
    type: 'Unknown',
    details: { error: String(error) },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(
      `Campos requeridos faltantes: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate userId
 */
export function validateUserId(userId: unknown): asserts userId is string | number {
  if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
    throw new ValidationError('ID de usuario inválido', { userId });
  }

  if (typeof userId === 'string' && userId.trim().length === 0) {
    throw new ValidationError('ID de usuario vacío');
  }

  if (typeof userId === 'number' && userId <= 0) {
    throw new ValidationError('ID de usuario debe ser mayor a 0');
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: unknown): asserts email is string {
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new ValidationError('Formato de email inválido', { email });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Formato de email inválido', { email });
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: unknown): asserts url is string {
  if (typeof url !== 'string') {
    throw new ValidationError('URL debe ser un string', { url });
  }

  try {
    new URL(url);
  } catch {
    throw new ValidationError('Formato de URL inválido', { url });
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSizeMB: number = 500): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (size > maxSizeBytes) {
    throw new ValidationError(
      `El archivo excede el tamaño máximo de ${maxSizeMB}MB`,
      { size, maxSizeMB }
    );
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[] = ['audio/*', 'video/*']
): void {
  const isAllowed = allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === allowed;
  });

  if (!isAllowed) {
    throw new ValidationError(
      `Tipo de archivo no permitido: ${mimeType}`,
      { mimeType, allowedTypes }
    );
  }
}

// ============================================================================
// Error Logging Helper
// ============================================================================

/**
 * Check if error should be logged (not user errors)
 */
export function shouldLogError(error: unknown): boolean {
  if (error instanceof ValidationError) return false;
  if (error instanceof AuthenticationError) return false;
  if (error instanceof QuotaExceededError) return false;
  if (error instanceof RateLimitError) return false;

  return true;
}
