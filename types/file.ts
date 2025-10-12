/**
 * File and upload types for Annalogica
 */

export type FileType = 'audio' | 'video' | 'text';

export type FileStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'error';

export type DownloadFormat = 'txt' | 'pdf' | 'both';

/**
 * Base file metadata shared across all states
 */
export interface FileMetadata {
  id: string;
  name: string;
  fileType: FileType;
  fileSize: number;
  date: string;
}

/**
 * File in uploading state
 */
export interface FileUploadingState extends FileMetadata {
  status: 'uploading';
  uploadProgress: number;
}

/**
 * File uploaded, pending processing
 */
export interface FilePendingState extends FileMetadata {
  status: 'pending';
  blobUrl: string;
  actions: string[];
}

/**
 * File being processed
 */
export interface FileProcessingState extends FileMetadata {
  status: 'processing';
  blobUrl: string;
  jobId: string;
  actions: string[];
  processingProgress: number;
  processingStartTime: number;
  estimatedTimeRemaining: number;
  audioDuration?: number;
}

/**
 * File processing completed
 */
export interface FileCompletedState extends FileMetadata {
  status: 'completed';
  jobId: string;
  processingProgress: 100;
}

/**
 * File processing failed
 */
export interface FileErrorState extends FileMetadata {
  status: 'error';
  errorMessage?: string;
}

/**
 * Union type of all file states
 * TypeScript can narrow the type based on status field
 */
export type UploadedFile =
  | FileUploadingState
  | FilePendingState
  | FileProcessingState
  | FileCompletedState
  | FileErrorState;

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
