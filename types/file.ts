/**
 * File and upload types for Annalogica
 */

export type FileType = 'audio' | 'video' | 'text';

export type FileStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'error';

export type DownloadFormat = 'txt' | 'pdf' | 'both';

/**
 * Uploaded file with all possible fields
 * Use type guards to narrow to specific states
 */
export interface UploadedFile {
  // Base metadata (always present)
  id: string;
  name: string;
  fileType: FileType;
  fileSize: number;
  date: string;
  status: FileStatus;

  // Upload state
  uploadProgress?: number;

  // Pending state
  blobUrl?: string;
  actions?: string[];

  // Processing state
  jobId?: string;
  processingProgress?: number;
  processingStartTime?: number;
  estimatedTimeRemaining?: number;
  audioDuration?: number;

  // Error state
  errorMessage?: string;
}

/**
 * Type aliases for specific states (for documentation)
 */
export type FileUploadingState = UploadedFile & {
  status: 'uploading';
  uploadProgress: number;
};

export type FilePendingState = UploadedFile & {
  status: 'pending';
  blobUrl: string;
  actions: string[];
};

export type FileProcessingState = UploadedFile & {
  status: 'processing';
  blobUrl: string;
  jobId: string;
  actions: string[];
  processingProgress: number;
  processingStartTime: number;
  estimatedTimeRemaining: number;
};

export type FileCompletedState = UploadedFile & {
  status: 'completed';
  jobId: string;
};

export type FileErrorState = UploadedFile & {
  status: 'error';
  errorMessage?: string;
};

/**
 * Type guard to check if file is uploading
 */
export function isFileUploading(file: UploadedFile): file is FileUploadingState {
  return file.status === 'uploading';
}

/**
 * Type guard to check if file is pending
 */
export function isFilePending(file: UploadedFile): file is FilePendingState {
  return file.status === 'pending';
}

/**
 * Type guard to check if file is processing
 */
export function isFileProcessing(file: UploadedFile): file is FileProcessingState {
  return file.status === 'processing';
}

/**
 * Type guard to check if file is completed
 */
export function isFileCompleted(file: UploadedFile): file is FileCompletedState {
  return file.status === 'completed';
}

/**
 * Type guard to check if file has error
 */
export function isFileError(file: UploadedFile): file is FileErrorState {
  return file.status === 'error';
}

/**
 * Type guard to check if file can be processed
 */
export function canProcessFile(file: UploadedFile): file is FilePendingState {
  return file.status === 'pending';
}

/**
 * Type guard to check if file has jobId
 */
export function hasJobId(
  file: UploadedFile
): file is FileProcessingState | FileCompletedState {
  return 'jobId' in file;
}
