// lib/error-tracker.ts
// Sistema de tracking de errores en base de datos + Sentry + Email notifications

import { sql } from '@vercel/postgres';
import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

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

    // 4. Enviar notificación por email para errores críticos/high
    if (errorId && (severity === 'critical' || severity === 'high')) {
      // Fire and forget - no esperar respuesta
      sendErrorNotification(
        errorId,
        errorType,
        severity,
        message,
        context,
        sentryEventId
      ).catch(err => {
        logger.error('[ErrorTracker] Failed to send notification (non-blocking)', err);
      });
    }

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
 * Enviar notificación por email para errores críticos/high
 */
async function sendErrorNotification(
  errorId: string,
  errorType: string,
  severity: ErrorSeverity,
  message: string,
  context?: ErrorContext,
  sentryEventId?: string
): Promise<void> {
  // Solo enviar para errores críticos y high
  if (severity !== 'critical' && severity !== 'high') {
    return;
  }

  // Verificar que esté configurado
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    logger.warn('[ErrorTracker] Email notification skipped (missing RESEND_API_KEY or ADMIN_EMAIL)', {
      errorId,
      severity,
    });
    return;
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#3b82f6',
    };

    const color = severityColors[severity] || '#6b7280';
    const sentryLink = sentryEventId
      ? `https://sentry.io/issues/?query=${sentryEventId}`
      : null;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">⚠️ Error del Sistema</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Annalogica Monitoring</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: ${color}; color: white; padding: 12px 20px; border-radius: 6px; margin-bottom: 20px; display: inline-block; font-weight: bold; text-transform: uppercase;">
        ${severity}
      </div>

      <h2 style="color: #1a1a1a; margin: 20px 0 15px 0;">${errorType}</h2>

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="font-size: 16px; color: #991b1b; margin: 0; font-family: monospace;">
          ${message}
        </p>
      </div>

      ${context?.userEmail ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Usuario afectado:</strong> ${context.userEmail}
          </p>
        </div>
      ` : ''}

      ${context?.requestUrl ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Request:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${context.requestMethod || 'GET'} ${context.requestUrl}</code>
          </p>
        </div>
      ` : ''}

      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Error ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${errorId}</code>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Tipo:</strong> ${errorType}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'short'
          })}
        </p>
      </div>

      <div style="margin-top: 30px; text-align: center; display: flex; gap: 10px; justify-content: center;">
        <a href="https://annalogica.eu/admin"
           style="background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
          🔍 Ver Dashboard
        </a>
        ${sentryLink ? `
          <a href="${sentryLink}"
             style="background: #362d59; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
            🐛 Ver en Sentry
          </a>
        ` : ''}
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db;">
      <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
        Error generado automáticamente por el sistema de monitoreo
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
        © 2025 Annalogica. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: 'Annalogica Errors <errors@annalogica.eu>',
      to: process.env.ADMIN_EMAIL,
      subject: `[${severity.toUpperCase()}] ${errorType}`,
      html: htmlBody,
    });

    logger.info('[ErrorTracker] Email notification sent', {
      errorId,
      errorType,
      severity,
      recipient: process.env.ADMIN_EMAIL,
    });
  } catch (error) {
    logger.error('[ErrorTracker] Failed to send email notification', error);
    // No lanzar error para no interrumpir el flujo
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
