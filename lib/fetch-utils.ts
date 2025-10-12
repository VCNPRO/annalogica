/**
 * Robust fetch utilities with timeout and retry logic
 */

import { logger } from './logger';
import { ExternalServiceError } from './errors';

// ============================================================================
// Constants
// ============================================================================

export const FETCH_DEFAULTS = {
  TIMEOUT_MS: 15000, // 15 seconds default timeout
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================================================
// Delay Helper
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = FETCH_DEFAULTS.INITIAL_RETRY_DELAY_MS * Math.pow(FETCH_DEFAULTS.BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, FETCH_DEFAULTS.MAX_RETRY_DELAY_MS);
}

// ============================================================================
// Fetch with Timeout
// ============================================================================

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with automatic timeout
 * Throws error if request takes longer than timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
  timeoutMs: number = FETCH_DEFAULTS.TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const actualTimeout = options.timeout ?? timeoutMs;
  const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${actualTimeout}ms`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }

    throw error;
  }
}

// ============================================================================
// Fetch with Retry
// ============================================================================

export interface FetchWithRetryOptions extends FetchWithTimeoutOptions {
  maxRetries?: number;
  shouldRetry?: (response: Response | undefined, error?: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry logic
 * Retries on 5xx errors and network errors
 */
function defaultShouldRetry(response: Response | undefined, error?: Error): boolean {
  // Retry on network errors
  if (error) {
    return error.name === 'TimeoutError' || error.message.includes('network');
  }

  // Retry on 5xx server errors
  if (response && response.status >= 500) {
    return true;
  }

  // Don't retry on client errors (4xx) or success (2xx/3xx)
  return false;
}

/**
 * Fetch with automatic retry on failure
 * Uses exponential backoff between retries
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = FETCH_DEFAULTS.MAX_RETRIES,
    shouldRetry = defaultShouldRetry,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions);
      lastResponse = response;

      // Check if we should retry based on response
      if (attempt < maxRetries && shouldRetry(response)) {
        const backoffDelay = calculateBackoffDelay(attempt);

        logger.warn('Fetch retry scheduled', {
          url,
          attempt: attempt + 1,
          maxRetries,
          status: response.status,
          delayMs: backoffDelay,
        });

        if (onRetry) {
          onRetry(attempt + 1, new Error(`HTTP ${response.status}`));
        }

        await delay(backoffDelay);
        continue;
      }

      // Success or non-retryable error
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry based on error
      if (attempt < maxRetries && shouldRetry(undefined, lastError)) {
        const backoffDelay = calculateBackoffDelay(attempt);

        logger.warn('Fetch retry scheduled after error', {
          url,
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
          delayMs: backoffDelay,
        });

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await delay(backoffDelay);
        continue;
      }

      // Max retries reached or non-retryable error
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs this
  if (lastError) throw lastError;
  if (lastResponse) return lastResponse;
  throw new Error('Unexpected retry loop exit');
}

// ============================================================================
// Fetch JSON with Type Safety
// ============================================================================

/**
 * Fetch JSON with automatic parsing and error handling
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Couldn't parse error response as JSON
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Request Deduplication
// ============================================================================

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Simple request deduplication cache
 * Prevents multiple identical requests from being made simultaneously
 */
export class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<any>>();
  private maxAge: number;

  constructor(maxAgeMs: number = 5000) {
    this.maxAge = maxAgeMs;
  }

  /**
   * Get or create a request
   * If an identical request is pending, returns the existing promise
   */
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if we have a pending request
    const existing = this.pending.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < this.maxAge) {
        logger.info('Request deduplicated', { key, age });
        return existing.promise;
      }
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pending.delete(key);
      });

    this.pending.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pending.clear();
  }

  /**
   * Clear a specific request
   */
  clearKey(key: string): void {
    this.pending.delete(key);
  }
}

// ============================================================================
// Abort Controller Manager
// ============================================================================

/**
 * Manage multiple AbortControllers
 * Useful for cleaning up on component unmount
 */
export class AbortManager {
  private controllers = new Map<string, AbortController>();

  /**
   * Create or get an AbortController
   */
  getController(key: string): AbortController {
    let controller = this.controllers.get(key);

    if (!controller || controller.signal.aborted) {
      controller = new AbortController();
      this.controllers.set(key, controller);
    }

    return controller;
  }

  /**
   * Abort a specific request
   */
  abort(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Abort all pending requests
   */
  abortAll(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  /**
   * Check if a request is aborted
   */
  isAborted(key: string): boolean {
    const controller = this.controllers.get(key);
    return controller?.signal.aborted ?? false;
  }
}

// ============================================================================
// Helper: Safe JSON Parse
// ============================================================================

/**
 * Safely parse JSON with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 */
export function safeJSONStringify(value: any, space?: number): string {
  try {
    return JSON.stringify(value, null, space);
  } catch (error) {
    logger.error('JSON stringify failed', error, { value });
    return '{}';
  }
}
