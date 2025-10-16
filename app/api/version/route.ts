import { NextResponse } from 'next/server';
import { assemblyAIBreaker } from '@/lib/circuit-breakers';

/**
 * Check current deployment version and circuit breaker config
 */
export async function GET() {
  // @ts-ignore - accessing private property for debugging
  const timeout = assemblyAIBreaker.options?.timeout || 'unknown';

  return NextResponse.json({
    circuitBreakerTimeout: timeout,
    expectedTimeout: 600000, // 10 minutes
    isCorrect: timeout === 600000,
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  });
}
