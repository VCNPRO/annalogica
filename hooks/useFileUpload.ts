/**
 * File upload hook
 * Manages file upload state and logic
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { UploadedFile, FileType } from '@/types/file';

export interface UseFileUploadReturn {
  files: UploadedFile[];
  uploading: boolean;
  error: string | null;
  uploadFiles: (fileList: FileList) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  updateFile: (fileId: string, updates: Partial<UploadedFile>) => void;
}

/**
 * Get file type from MIME type
 */
function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('text/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'text';
  }
  return 'text'; // Default fallback
}

/**
 * Hook for managing file uploads
 */
export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (fileList: FileList) => {
    console.log('[useFileUpload] uploadFiles called with', fileList.length, 'files');
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      console.log('[useFileUpload] Starting upload process...');
      const { upload } = await import('@vercel/blob/client');

      // Create file entries for all files
      const filesToUpload = Array.from(fileList).map((file, i) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          fileType: getFileType(file.type),
          fileSize: file.size,
          date: new Date().toISOString(),
          status: 'uploading',
          uploadProgress: 0,
        };
        return { file, fileId, newFile };
      });

      // Add all files to state
      console.log('[useFileUpload] Adding files to state:', filesToUpload.map(f => f.newFile));
      setFiles(prev => {
        const updated = [...prev, ...filesToUpload.map(f => f.newFile)];
        console.log('[useFileUpload] Files state updated. New length:', updated.length);
        return updated;
      });

      // Upload files in parallel
      const uploadPromises = filesToUpload.map(async ({ file, fileId }) => {
        try {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const uniqueFilename = `${timestamp}-${randomSuffix}-${file.name}`;

          console.log('[useFileUpload] Starting upload for:', {
            filename: file.name,
            size: file.size,
            type: file.type,
            sizeMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
          });

          const blob = await upload(uniqueFilename, file, {
            access: 'public',
            handleUploadUrl: '/api/blob-upload',
            clientPayload: JSON.stringify({
              size: file.size,
              type: file.type,
            }),
            onUploadProgress: ({ percentage }) => {
              console.log(`[useFileUpload] Upload progress for ${file.name}:`, percentage + '%');
              setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, uploadProgress: percentage } : f
              ));
            },
          });

          console.log('[useFileUpload] Upload completed:', blob.url);

          // Update file with blob URL and change to pending
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              uploadProgress: 100,
              status: 'pending',
              blobUrl: blob.url,
              actions: [],
            } as UploadedFile : f
          ));

          logger.info('File uploaded successfully', {
            fileId,
            filename: file.name,
            size: file.size
          });
        } catch (err) {
          console.error('[useFileUpload] Upload error for', file.name, ':', err);
          console.error('[useFileUpload] Error details:', {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            type: typeof err,
            fileId,
            filename: file.name
          });

          logger.error('File upload failed', err, {
            fileId,
            filename: file.name
          });

          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'error',
              errorMessage: err instanceof Error ? err.message : 'Error al subir archivo'
            } as UploadedFile : f
          ));
        }
      });

      await Promise.all(uploadPromises);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir archivos';
      logger.error('Upload files error', err);
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const updateFile = useCallback((fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, ...updates } : f
    ));
  }, []);

  return {
    files,
    uploading,
    error,
    uploadFiles,
    removeFile,
    clearFiles,
    updateFile,
  };
}
