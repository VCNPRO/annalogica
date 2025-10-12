/**
 * Standardized API response helpers for Annalogica
 * Ensures consistent response format across all API routes
 */

import { NextResponse } from 'next/server';
import { parseError, shouldLogError, type ErrorInfo } from './errors';
import { logger } from './logger';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

/**
 * Paginated response
 */
export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// ============================================================================
// Response Builders
// ============================================================================

let requestCounter = 0;

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % 1000000;
  const timestamp = Date.now().toString(36);
  const counter = requestCounter.toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `req_${timestamp}${counter}${random}`;
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated JSON response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);

  const response: ApiPaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Create an error JSON response from ErrorInfo
 */
export function errorResponse(
  errorInfo: ErrorInfo,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: errorInfo.userMessage,
    code: errorInfo.code,
    details: process.env.NODE_ENV === 'development' ? errorInfo.details : undefined,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return NextResponse.json(response, { status: errorInfo.httpStatus });
}

/**
 * Create an error response from any error object
 * Automatically logs errors and generates request ID
 */
export function handleError(
  error: unknown,
  context?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  const errorInfo = parseError(error);
  const requestId = generateRequestId();

  // Log error if it's not a user error
  if (shouldLogError(error)) {
    logger.error('API Error', error, {
      ...context,
      requestId,
      code: errorInfo.code,
      httpStatus: errorInfo.httpStatus,
    });
  } else {
    // Log user errors at info level
    logger.info('User error', {
      ...context,
      requestId,
      code: errorInfo.code,
      message: errorInfo.userMessage,
    });
  }

  return errorResponse(errorInfo, requestId);
}

// ============================================================================
// Specialized Response Helpers
// ============================================================================

/**
 * Create a 201 Created response
 */
export function createdResponse<T>(data: T, message?: string): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, message, 201);
}

/**
 * Create a 204 No Content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(
  message: string,
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  return errorResponse({
    code: 'BAD_REQUEST',
    userMessage: message,
    httpStatus: 400,
    type: 'ValidationError',
    details,
  });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(
  message: string = 'No autorizado'
): NextResponse<ApiErrorResponse> {
  return errorResponse({
    code: 'UNAUTHORIZED',
    userMessage: message,
    httpStatus: 401,
    type: 'AuthenticationError',
  });
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(
  message: string = 'Acceso denegado',
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  return errorResponse({
    code: 'FORBIDDEN',
    userMessage: message,
    httpStatus: 403,
    type: 'AuthorizationError',
    details,
  });
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(
  resource: string,
  id?: string | number
): NextResponse<ApiErrorResponse> {
  const message = id
    ? `${resource} con ID ${id} no encontrado`
    : `${resource} no encontrado`;

  return errorResponse({
    code: 'NOT_FOUND',
    userMessage: message,
    httpStatus: 404,
    type: 'NotFoundError',
    details: { resource, id },
  });
}

/**
 * Create a 429 Too Many Requests response
 */
export function tooManyRequestsResponse(
  message: string = 'Demasiadas solicitudes',
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  const response = errorResponse({
    code: 'RATE_LIMIT_EXCEEDED',
    userMessage: message,
    httpStatus: 429,
    type: 'RateLimitError',
    details: { retryAfter },
  });

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalServerErrorResponse(
  message: string = 'Error interno del servidor'
): NextResponse<ApiErrorResponse> {
  return errorResponse({
    code: 'INTERNAL_SERVER_ERROR',
    userMessage: message,
    httpStatus: 500,
    type: 'ServerError',
  });
}

/**
 * Create a 503 Service Unavailable response
 */
export function serviceUnavailableResponse(
  service: string,
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  const response = errorResponse({
    code: 'SERVICE_UNAVAILABLE',
    userMessage: `El servicio ${service} no está disponible temporalmente`,
    httpStatus: 503,
    type: 'ServiceError',
    details: { service, retryAfter },
  });

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

// ============================================================================
// API Handler Wrapper
// ============================================================================

/**
 * Wrap an API handler with automatic error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error, {
        handler: handler.name || 'anonymous',
        args: args.length,
      });
    }
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if response is a success response
 */
export function isSuccessResponse(response: any): response is ApiSuccessResponse {
  return response && response.success === true && 'data' in response;
}

/**
 * Check if response is an error response
 */
export function isErrorResponse(response: any): response is ApiErrorResponse {
  return response && response.success === false && 'error' in response && 'code' in response;
}

/**
 * Check if response is paginated
 */
export function isPaginatedResponse(response: any): response is ApiPaginatedResponse<any> {
  return isSuccessResponse(response) && 'pagination' in response;
}
