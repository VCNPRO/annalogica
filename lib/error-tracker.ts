// lib/error-tracker.ts
// Sistema de tracking de errores en base de datos + Sentry

import { sql } from '@vercel/postgres';
import * as Sentry from '@sentry/nextjs';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders?: Record<string, any>;
  requestBody?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Registra un error en la base de datos y en Sentry
 */
export async function trackError(
  errorType: string,
  severity: ErrorSeverity,
  message: string,
  error?: Error | unknown,
  context?: ErrorContext
): Promise<string | null> {
  try {
    // 1. Capturar en Sentry
    let sentryEventId: string | undefined;

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.withScope((scope) => {
        // Agregar contexto
        if (context?.userId) {
          scope.setUser({ id: context.userId, email: context.userEmail });
        }

        if (context?.metadata) {
          scope.setContext('custom', context.metadata);
        }

        if (context?.requestUrl) {
          scope.setContext('request', {
            url: context.requestUrl,
            method: context.requestMethod,
            headers: context.requestHeaders,
            body: context.requestBody,
          });
        }

        scope.setTag('error_type', errorType);
        scope.setLevel(severityToSentryLevel(severity));

        // Capturar error
        if (error instanceof Error) {
          sentryEventId = Sentry.captureException(error);
        } else {
          sentryEventId = Sentry.captureMessage(message, severityToSentryLevel(severity));
        }
      });
    }

    // 2. Guardar en base de datos
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const result = await sql`
      INSERT INTO system_errors (
        error_type,
        severity,
        message,
        stack_trace,
        user_id,
        user_email,
        request_url,
        request_method,
        request_headers,
        request_body,
        user_agent,
        ip_address,
        metadata,
        sentry_event_id
      ) VALUES (
        ${errorType},
        ${severity},
        ${message},
        ${stackTrace || null},
        ${context?.userId || null},
        ${context?.userEmail || null},
        ${context?.requestUrl || null},
        ${context?.requestMethod || null},
        ${context?.requestHeaders ? JSON.stringify(context.requestHeaders) : null},
        ${context?.requestBody ? JSON.stringify(context.requestBody) : null},
        ${context?.userAgent || null},
        ${context?.ipAddress || null},
        ${context?.metadata ? JSON.stringify(context.metadata) : null},
        ${sentryEventId || null}
      )
      RETURNING id
    `;

    const errorId = result.rows[0]?.id;

    // 3. Log en consola
    console.error(`[ErrorTracker] ${severity.toUpperCase()} - ${errorType}:`, {
      message,
      errorId,
      sentryEventId,
      userId: context?.userId,
      url: context?.requestUrl,
    });

    return errorId;
  } catch (err) {
    // Si falla el tracking, al menos logear en consola
    console.error('[ErrorTracker] Failed to track error:', err);
    console.error('[ErrorTracker] Original error:', {
      errorType,
      severity,
      message,
      error,
    });
    return null;
  }
}

/**
 * Obtener errores no resueltos
 */
export async function getUnresolvedErrors(limit: number = 50) {
  try {
    const result = await sql`
      SELECT * FROM recent_unresolved_errors
      LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    console.error('[ErrorTracker] Failed to get unresolved errors:', error);
    return [];
  }
}

/**
 * Marcar error como resuelto
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  resolutionNotes?: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE system_errors
      SET
        is_resolved = TRUE,
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = ${resolvedBy},
        resolution_notes = ${resolutionNotes || null}
      WHERE id = ${errorId}
    `;
    return true;
  } catch (error) {
    console.error('[ErrorTracker] Failed to resolve error:', error);
    return false;
  }
}

/**
 * Obtener estadísticas de errores (últimas 24h)
 */
export async function getErrorStats24h() {
  try {
    const result = await sql`SELECT * FROM get_error_stats_24h()`;
    return result.rows;
  } catch (error) {
    console.error('[ErrorTracker] Failed to get error stats:', error);
    return [];
  }
}

/**
 * Helper: Convertir severidad a nivel de Sentry
 */
function severityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
    low: 'info',
    medium: 'warning',
    high: 'error',
    critical: 'fatal',
  };
  return mapping[severity];
}

/**
 * Helper: Extraer contexto de Next.js Request
 */
export function extractRequestContext(request: Request): Partial<ErrorContext> {
  try {
    const url = new URL(request.url);

    return {
      requestUrl: url.pathname + url.search,
      requestMethod: request.method,
      requestHeaders: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent') || undefined,
      // IP address detection (works with Vercel)
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        undefined,
    };
  } catch (error) {
    return {};
  }
}
