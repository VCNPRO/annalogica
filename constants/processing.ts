/**
 * Processing constants for transcription jobs
 */

export const PROCESSING_CONSTANTS = {
  /**
   * Timer update interval (ms)
   * How often to update elapsed time displays
   */
  TIMER_INTERVAL_MS: 1000,

  /**
   * Job polling interval (ms)
   * How often to check job status updates
   */
  POLL_INTERVAL_MS: 5000,

  /**
   * Whisper processing speed multiplier
   * Whisper typically processes at ~0.2-0.3x real-time
   * (i.e., 10 minutes of audio takes ~2-3 minutes to process)
   */
  WHISPER_PROCESSING_MULTIPLIER: 0.25,

  /**
   * Timeout multiplier for job processing
   * Max expected time = audio duration * multiplier
   */
  TIMEOUT_MULTIPLIER: 0.5,

  /**
   * Minimum timeout (seconds)
   * Even short files should have at least this much time
   */
  MIN_TIMEOUT_SECONDS: 300, // 5 minutes

  /**
   * Progress cap before completion
   * Don't show 100% until actually complete
   */
  PROGRESS_CAP_BEFORE_COMPLETION: 90,

  /**
   * Progress when transcribed but waiting for summary
   */
  TRANSCRIBED_PROGRESS: 98,

  /**
   * Estimated seconds for summary generation
   */
  SUMMARY_GENERATION_SECONDS: 5,

  /**
   * 🔥 WATCHDOG ANTI-CLAVADO: Detecta jobs sin progreso
   */

  /**
   * Tiempo máximo sin progreso antes de alerta (minutos)
   * Si un job lleva >20 min sin cambiar de progreso → ALERTA
   */
  MAX_NO_PROGRESS_MINUTES: 20,

  /**
   * Tiempo máximo sin progreso antes de auto-fail (minutos)
   * Si un job lleva >30 min sin cambiar → MARCAR COMO FAILED
   */
  MAX_NO_PROGRESS_CRITICAL_MINUTES: 30,

  /**
   * Intervalo de chequeo del watchdog (segundos)
   * Cada cuánto tiempo verificar si hay jobs clavados
   */
  WATCHDOG_CHECK_INTERVAL_SECONDS: 30,
} as const;

export const FILE_CONSTANTS = {
  /**
   * Maximum file size (bytes) - CON CHUNKING IMPLEMENTADO
   * Audio: 500MB con chunking automático (~500 min)
   * Video: 500MB con chunking automático (~500 min)
   * Documentos: 50MB
   *
   * NOTA: OpenAI Whisper tiene límite de 25MB por request, pero usamos
   * chunking automático para archivos grandes (dividir en partes <25MB)
   */
  MAX_FILE_SIZE_AUDIO_BYTES: 500 * 1024 * 1024,
  MAX_FILE_SIZE_VIDEO_BYTES: 500 * 1024 * 1024,
  MAX_FILE_SIZE_DOCUMENT_BYTES: 50 * 1024 * 1024,

  /**
   * Maximum file size (MB) for display
   */
  MAX_FILE_SIZE_AUDIO_MB: 500,
  MAX_FILE_SIZE_VIDEO_MB: 500,
  MAX_FILE_SIZE_DOCUMENT_MB: 50,

  /**
   * @deprecated Use specific size constants instead
   */
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024,
  MAX_FILE_SIZE_MB: 100,

  /**
   * Supported audio MIME types
   */
  AUDIO_MIME_TYPES: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
  ] as const,

  /**
   * Supported video MIME types
   */
  VIDEO_MIME_TYPES: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ] as const,

  /**
   * Supported text MIME types
   */
  TEXT_MIME_TYPES: [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,
} as const;

export const UI_CONSTANTS = {
  /**
   * Notification auto-dismiss time (ms)
   */
  NOTIFICATION_DURATION_MS: 5000,

  /**
   * Debounce delay for search/input (ms)
   */
  DEBOUNCE_DELAY_MS: 300,

  /**
   * Toast fade out duration (ms)
   */
  TOAST_FADE_OUT_MS: 300,

  /**
   * Modal animation duration (ms)
   */
  MODAL_ANIMATION_MS: 200,

  /**
   * Progress bar animation duration (ms)
   */
  PROGRESS_ANIMATION_MS: 500,
} as const;

export const STORAGE_CONSTANTS = {
  /**
   * File retention period (days)
   * How long processed files are kept in storage
   */
  FILE_RETENTION_DAYS: 30,

  /**
   * Original audio retention (minutes)
   * Original audio files are deleted after this time
   * Set to 0 to delete immediately after processing
   */
  ORIGINAL_AUDIO_RETENTION_MINUTES: 0,

  /**
   * LocalStorage keys
   */
  STORAGE_KEYS: {
    USER: 'user',
    THEME: 'theme',
    LANGUAGE: 'language',
    DEFAULT_OPTIONS: 'defaultOptions',
    DOWNLOAD_PATH: 'downloadPath',
  } as const,
} as const;

export const SUBSCRIPTION_CONSTANTS = {
  /**
   * Free plan monthly quota
   */
  FREE_PLAN_QUOTA: 10,

  /**
   * Basic plan monthly quota
   */
  BASIC_PLAN_QUOTA: 50,

  /**
   * Pro plan monthly quota
   */
  PRO_PLAN_QUOTA: 200,

  /**
   * Enterprise plan monthly quota
   */
  ENTERPRISE_PLAN_QUOTA: 1000,

  /**
   * Upgrade suggestion threshold (%)
   * Suggest upgrade when usage exceeds this percentage
   */
  UPGRADE_SUGGESTION_THRESHOLD: 80,

  /**
   * Days before reset to suggest upgrade
   * Only suggest if this many days remain until quota reset
   */
  MIN_DAYS_FOR_UPGRADE_SUGGESTION: 7,
} as const;

/**
 * Get quota by plan name
 */
export function getQuotaByPlan(plan: string): number {
  switch (plan.toLowerCase()) {
    case 'basic':
      return SUBSCRIPTION_CONSTANTS.BASIC_PLAN_QUOTA;
    case 'pro':
      return SUBSCRIPTION_CONSTANTS.PRO_PLAN_QUOTA;
    case 'enterprise':
      return SUBSCRIPTION_CONSTANTS.ENTERPRISE_PLAN_QUOTA;
    case 'free':
    default:
      return SUBSCRIPTION_CONSTANTS.FREE_PLAN_QUOTA;
  }
}

/**
 * Check if MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return (
    FILE_CONSTANTS.AUDIO_MIME_TYPES.includes(mimeType as any) ||
    FILE_CONSTANTS.VIDEO_MIME_TYPES.includes(mimeType as any) ||
    FILE_CONSTANTS.TEXT_MIME_TYPES.includes(mimeType as any) ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/')
  );
}
