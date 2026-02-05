import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (will use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

// Rate limiters for different endpoints
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 attempts per 5 minutes
      analytics: true,
      prefix: '@annalogica/login',
    })
  : null;

export const registerRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 registrations per hour per IP
      analytics: true,
      prefix: '@annalogica/register',
    })
  : null;

export const uploadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 uploads per hour
      analytics: true,
      prefix: '@annalogica/upload',
    })
  : null;

export const processRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000000, '1 h'), // 1,000,000 transcriptions per hour
      analytics: true,
      prefix: '@annalogica/process',
    })
  : null;

export const downloadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'), // 30 downloads per hour
      analytics: true,
      prefix: '@annalogica/download',
    })
  : null;

export const ragRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 RAG queries per minute
      analytics: true,
      prefix: '@annalogica/rag',
    })
  : null;

export const apiGeneralRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute general
      analytics: true,
      prefix: '@annalogica/api-general',
    })
  : null;

/**
 * Get client identifier from request (user ID or IP)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  // Try to get IP from headers (Vercel provides this)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  return `ip:${ip}`;
}

/**
 * Check rate limit and return response if exceeded
 */
export async function checkRateLimit(
  rateLimit: Ratelimit | null,
  identifier: string,
  limitName: string = 'requests'
): Promise<Response | null> {
  if (!rateLimit) {
    // If Redis is not configured (local dev), skip rate limiting
    return null;
  }

  const { success, limit, reset, remaining } = await rateLimit.limit(identifier);

  if (!success) {
    const resetDate = new Date(reset);
    const resetInMinutes = Math.ceil((reset - Date.now()) / 1000 / 60);

    return Response.json(
      {
        error: `Demasiados ${limitName}. Intenta de nuevo en ${resetInMinutes} minutos.`,
        retryAfter: reset,
        limit,
        remaining: 0
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  reset: number
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', reset.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
