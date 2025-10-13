/**
 * Barrel export for all custom hooks
 */

export { useAuth } from './useAuth';
export type { UseAuthReturn } from './useAuth';

export { useFileUpload } from './useFileUpload';
export type { UseFileUploadReturn } from './useFileUpload';

export { useJobPolling } from './useJobPolling';
export type { UseJobPollingOptions } from './useJobPolling';

export { useFileProcessing } from './useFileProcessing';
export type { UseFileProcessingReturn } from './useFileProcessing';

export {
  useTimer,
  formatElapsedTime,
  formatTimeRemaining,
  formatFileSize
} from './useTimer';
export type { UseTimerOptions } from './useTimer';
