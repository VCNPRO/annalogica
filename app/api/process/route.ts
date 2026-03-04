import { waitUntil } from '@vercel/functions';
import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { TranscriptionJobDB } from '@/lib/db';
import { checkSeparateQuotas, incrementAudioUsage } from '@/lib/subscription-guard-v2';
import { processAudioFile } from '@/lib/processors/audio-processor';
import {
  successResponse,
  handleError,
  unauthorizedResponse,
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
export const maxDuration = 800;

/**
 * POST /api/process
 * Creates a transcription job and processes it in the background.
 * Returns jobId immediately so the client can poll for progress.
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);

    if (!user) {
      logger.security('Process API: Authentication failed', {});
      return unauthorizedResponse();
    }

    // QUOTA: Check subscription status and quota
    const quotaStatus = await checkSeparateQuotas(user.userId);

    if (!quotaStatus.canUploadAudio) {
      throw new QuotaExceededError(
        quotaStatus.message || 'Has alcanzado el límite de minutos de audio de tu plan',
        quotaStatus.quotaAudioMinutes,
        quotaStatus.usageAudioMinutes,
        quotaStatus.resetDate
      );
    }

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

    validateRequired(body, ['audioUrl', 'filename', 'language']);
    validateUrl(audioUrl);

    if (typeof filename !== 'string' || filename.trim().length === 0) {
      throw new ValidationError('Filename debe ser un string no vacío');
    }

    if (!Array.isArray(actions)) {
      throw new ValidationError('Actions debe ser un array');
    }

    if (summaryType !== 'short' && summaryType !== 'detailed') {
      throw new ValidationError('summaryType debe ser "short" o "detailed"');
    }

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
    }

    logger.info('Process API: Job created, starting background processing', {
      jobId: job.id,
      userId: user.userId,
      filename
    });

    // Process in background — function keeps running after response is sent
    waitUntil(
      (async () => {
        try {
          await processAudioFile(job.id);
          logger.info('Process API: Background processing completed', { jobId: job.id });

          // Increment audio usage based on actual duration
          try {
            const { getTranscriptionJob } = await import('@/lib/db/transcriptions');
            const completedJob = await getTranscriptionJob(job.id);

            if (completedJob && completedJob.audio_duration_seconds) {
              const durationMinutes = completedJob.audio_duration_seconds / 60;
              await incrementAudioUsage(user.userId, durationMinutes);
            } else {
              await incrementAudioUsage(user.userId, 1);
            }
          } catch (usageError) {
            logger.error('Process API: Failed to increment audio usage (non-fatal)', usageError, {
              userId: user.userId,
              jobId: job.id
            });
          }
        } catch (processingError: any) {
          logger.error('Process API: Background processing failed', processingError, {
            jobId: job.id,
            userId: user.userId
          });

          await trackError(
            'processing_error',
            'critical',
            processingError.message || 'Error en procesamiento de audio',
            processingError,
            {
              userId: user.userId,
              userEmail: user.email,
              metadata: { jobId: job.id, filename, audioUrl: audioUrl.substring(0, 100) }
            }
          );
        }
      })()
    );

    // Return immediately with jobId — client polls /api/jobs/:jobId for progress
    const response: JobCreateResponse = {
      success: true,
      message: 'Procesamiento iniciado. Puedes ver el progreso en tiempo real.',
      jobId: job.id,
      status: 'processing'
    };

    return successResponse(response, 'Procesamiento iniciado', 202);
  } catch (error: any) {
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
