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
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setUploading(true);

    try {
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
      setFiles(prev => [...prev, ...filesToUpload.map(f => f.newFile)]);

      // Upload files in parallel
      const uploadPromises = filesToUpload.map(async ({ file, fileId }) => {
        try {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const uniqueFilename = `${timestamp}-${randomSuffix}-${file.name}`;

          const blob = await upload(uniqueFilename, file, {
            access: 'public',
            handleUploadUrl: '/api/blob-upload',
            clientPayload: JSON.stringify({
              size: file.size,
              type: file.type,
            }),
            onUploadProgress: ({ percentage }) => {
              setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, uploadProgress: percentage } : f
              ));
            },
          });

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
