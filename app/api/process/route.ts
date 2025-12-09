import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { TranscriptionJobDB } from '@/lib/db';
import { checkSeparateQuotas, incrementAudioUsage } from '@/lib/subscription-guard-v2';
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
import { trackError, extractRequestContext } from '@/lib/error-tracker';
import type { JobCreateResponse } from '@/types/job';

// Configure maximum execution time for audio processing
// Pro plan: 300s (5 minutes), Hobby: 10s
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/process
 * Process audio transcription synchronously
 * May take 2-5 minutes for audio files
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

    // QUOTA: Check subscription status and quota (separate quotas for audio)
    logger.info('Process API: Checking audio quota', { userId: user.userId });
    const quotaStatus = await checkSeparateQuotas(user.userId);

    if (!quotaStatus.canUploadAudio) {
      logger.info('Process API: Audio quota exceeded', {
        userId: user.userId,
        usageAudioMinutes: quotaStatus.usageAudioMinutes,
        quotaAudioMinutes: quotaStatus.quotaAudioMinutes
      });

      throw new QuotaExceededError(
        quotaStatus.message || 'Has alcanzado el límite de minutos de audio de tu plan',
        quotaStatus.quotaAudioMinutes,
        quotaStatus.usageAudioMinutes,
        quotaStatus.resetDate
      );
    }

    logger.info('Process API: Audio quota verified', {
      userId: user.userId,
      remainingAudioMinutes: quotaStatus.remainingAudioMinutes
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

    logger.info('Process API: Starting synchronous processing', { jobId: job.id });

    // Process audio synchronously (wait for completion before responding)
    // This is necessary because Vercel Functions terminate after sending response
    // For beta with short audios (<30min) this is acceptable
    try {
      await processAudioFile(job.id);
      logger.info('Process API: Processing completed successfully', { jobId: job.id });

      // QUOTA: Increment audio usage based on actual duration
      try {
        const { getTranscriptionJob } = await import('@/lib/db/transcriptions');
        const completedJob = await getTranscriptionJob(job.id);

        if (completedJob && completedJob.audio_duration_seconds) {
          const durationMinutes = completedJob.audio_duration_seconds / 60;
          await incrementAudioUsage(user.userId, durationMinutes);
          logger.info('Process API: Audio usage incremented', {
            userId: user.userId,
            durationSeconds: completedJob.audio_duration_seconds,
            durationMinutes
          });
        } else {
          // Fallback: increment 1 minute if duration unknown
          await incrementAudioUsage(user.userId, 1);
          logger.warn('Process API: Audio duration unknown, incremented 1 minute', { userId: user.userId });
        }
      } catch (error) {
        // Don't fail the request if usage increment fails
        logger.error('Process API: Failed to increment audio usage (non-fatal)', error, {
          userId: user.userId,
          jobId: job.id
        });
      }

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

      // Track error en sistema de monitoreo
      const context = extractRequestContext(request);
      await trackError(
        'processing_error',
        'critical',
        processingError.message || 'Error desconocido en procesamiento de audio',
        processingError,
        {
          ...context,
          userId: user.userId,
          userEmail: user.email,
          metadata: {
            jobId: job.id,
            filename,
            audioUrl: audioUrl.substring(0, 100),
            actions,
            summaryType
          }
        }
      );

      // Return error response
      return successResponse({
        success: false,
        message: processingError.message || 'Error en el procesamiento. Por favor intenta de nuevo.',
        jobId: job.id,
        status: 'failed',
        error: processingError.message
      }, 'Error en procesamiento', 500);
    }
  } catch (error: any) {
    // Track error en sistema de monitoreo
    const context = extractRequestContext(request);
    await trackError(
      'api_process_error',
      'high',
      error.message || 'Error desconocido en API /api/process',
      error,
      context
    );

    return handleError(error, {
      endpoint: 'POST /api/process'
    });
  }
}
