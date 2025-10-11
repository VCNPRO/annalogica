/**
 * Sistema de logging centralizado
 *
 * Uso:
 * import { logger } from '@/lib/logger';
 * logger.info('Usuario logueado', { userId: '123' });
 * logger.error('Error en proceso', error, { jobId: 'abc' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  // Security-specific logging
  security(event: string, context: LogContext) {
    this.info(`[SECURITY] ${event}`, context);
  }

  // Performance logging
  performance(metric: string, duration: number, context?: LogContext) {
    this.info(`[PERFORMANCE] ${metric}`, { duration_ms: duration, ...context });
  }
}

export const logger = new Logger();
