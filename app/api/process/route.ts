import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { TranscriptionJobDB } from '@/lib/db';
import { checkSubscriptionStatus, incrementUsage } from '@/lib/subscription-guard';
import { processAudioFile } from '@/lib/processors/audio-processor';
import {
  successResponse,
  handleError,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse
} from '@/lib/api-response';
import {
  ValidationError,
  QuotaExceededError,
  validateRequired,
  validateUrl
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { JobCreateResponse } from '@/types/job';

/**
 * POST /api/process
 * Create transcription job (async) - returns immediately
 * Job will be processed in background by Inngest
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Verify authentication
    logger.info('Process API: Authentication check started');

    const user = verifyRequestAuth(request);

    if (!user) {
      logger.security('Process API: Authentication failed', {});
      return unauthorizedResponse();
    }

    logger.info('Process API: User authenticated', {
      userId: user.userId,
      email: user.email
    });

    // QUOTA: Check subscription status and quota
    logger.info('Process API: Checking subscription quota', { userId: user.userId });
    const subscriptionStatus = await checkSubscriptionStatus(user.userId);

    if (!subscriptionStatus.canUpload) {
      logger.info('Process API: Quota exceeded', {
        userId: user.userId,
        usage: subscriptionStatus.usage,
        quota: subscriptionStatus.quota
      });

      throw new QuotaExceededError(
        subscriptionStatus.message || 'Has alcanzado el límite de tu plan',
        subscriptionStatus.quota,
        subscriptionStatus.usage,
        subscriptionStatus.resetDate
      );
    }

    logger.info('Process API: Quota verified', {
      userId: user.userId,
      remaining: subscriptionStatus.remaining
    });

    // SECURITY: Rate limiting
    const identifier = getClientIdentifier(request, user.userId);
    const rateLimitResponse = await checkRateLimit(
      processRateLimit,
      identifier,
      'transcripciones procesadas'
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate request body
    const body = await request.json();
    const { audioUrl, filename, language, actions = [], summaryType = 'detailed' } = body;

    // Validate required fields
    validateRequired(body, ['audioUrl', 'filename', 'language']);

    // Validate URL format
    validateUrl(audioUrl);

    // Validate filename
    if (typeof filename !== 'string' || filename.trim().length === 0) {
      throw new ValidationError('Filename debe ser un string no vacío');
    }

    // Validate actions array
    if (!Array.isArray(actions)) {
      throw new ValidationError('Actions debe ser un array');
    }

    // Validate summaryType
    if (summaryType !== 'short' && summaryType !== 'detailed') {
      throw new ValidationError('summaryType debe ser "short" o "detailed"');
    }

    logger.info('Process API: Received request params', {
      userId: user.userId,
      filename,
      actions,
      summaryType
    });

    // Create job in database
    const job = await TranscriptionJobDB.create(
      user.userId,
      filename.trim(),
      audioUrl,
      language
    );

    // Store actions and summaryType in metadata
    if (actions.length > 0 || summaryType) {
      await TranscriptionJobDB.updateResults(job.id, {
        metadata: { actions, summaryType }
      });
      logger.info('Process API: Metadata stored', {
        jobId: job.id,
        actions,
        summaryType
      });
    }

    logger.info('Process API: Job created', {
      jobId: job.id,
      userId: user.userId,
      filename,
      audioUrl: audioUrl.substring(0, 50) + '...'
    });

    // QUOTA: Increment usage counter after successful job creation
    try {
      await incrementUsage(user.userId);
      logger.info('Process API: Usage incremented', { userId: user.userId });
    } catch (error) {
      // Don't fail the request if usage increment fails
      // Log error and continue
      logger.error('Process API: Failed to increment usage (non-fatal)', error, {
        userId: user.userId,
        jobId: job.id
      });
    }

    // Return immediately - processing will happen and frontend will poll
    const response: JobCreateResponse = {
      success: true,
      message: 'Transcripción en proceso. Esto puede tardar 1-3 minutos.',
      jobId: job.id,
      status: 'pending'
    };

    logger.info('Process API: Starting synchronous processing', { jobId: job.id });

    // Process audio synchronously (wait for completion before responding)
    // This is necessary because Vercel Functions terminate after sending response
    // For beta with short audios (<30min) this is acceptable
    try {
      await processAudioFile(job.id);
      logger.info('Process API: Processing completed successfully', { jobId: job.id });

      // Return success with completed status
      const completedResponse: JobCreateResponse = {
        success: true,
        message: 'Transcripción completada exitosamente.',
        jobId: job.id,
        status: 'completed'
      };

      return successResponse(completedResponse, 'Procesamiento completado', 200);
    } catch (processingError: any) {
      logger.error('Process API: Processing failed', processingError, {
        jobId: job.id,
        userId: user.userId
      });

      // Return error response
      return successResponse({
        success: false,
        message: 'Error en el procesamiento. Por favor intenta de nuevo.',
        jobId: job.id,
        status: 'failed',
        error: processingError.message
      }, 'Error en procesamiento', 500);
    }
  } catch (error) {
    return handleError(error, {
      endpoint: 'POST /api/process'
    });
  }
}
