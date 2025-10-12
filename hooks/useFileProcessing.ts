/**
 * File processing hook
 * Manages file selection, action application, and processing
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { UploadedFile } from '@/types/file';

export interface UseFileProcessingReturn {
  selectedFileIds: Set<string>;
  selectFile: (fileId: string) => void;
  selectAll: (files: UploadedFile[]) => void;
  deselectAll: () => void;
  applyAction: (files: UploadedFile[], actionName: string) => UploadedFile[];
  processFiles: (
    files: UploadedFile[],
    onUpdate: (fileId: string, updates: Partial<UploadedFile>) => void
  ) => Promise<{ processed: number; errors: number }>;
}

/**
 * Hook for managing file processing
 */
export function useFileProcessing(): UseFileProcessingReturn {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const selectFile = useCallback((fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((files: UploadedFile[]) => {
    setSelectedFileIds(new Set(files.map(f => f.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const applyAction = useCallback((
    files: UploadedFile[],
    actionName: string
  ): UploadedFile[] => {
    return files.map(file => {
      if (!selectedFileIds.has(file.id)) return file;

      // Only files in pending state can have actions
      if (file.status !== 'pending') return file;

      const currentActions = file.actions || [];
      const hasAction = currentActions.includes(actionName);

      return {
        ...file,
        actions: hasAction
          ? currentActions.filter(a => a !== actionName)
          : [...currentActions, actionName]
      };
    });
  }, [selectedFileIds]);

  const processFiles = useCallback(async (
    files: UploadedFile[],
    onUpdate: (fileId: string, updates: Partial<UploadedFile>) => void
  ): Promise<{ processed: number; errors: number }> => {
    logger.info('Processing files started', {
      selectedCount: selectedFileIds.size
    });

    if (selectedFileIds.size === 0) {
      throw new Error('Por favor, selecciona al menos un archivo para procesar.');
    }

    const filesToProcess = files.filter(file => selectedFileIds.has(file.id));

    // Validate files have actions
    const filesWithoutActions = filesToProcess.filter(
      f => f.status === 'pending' && (!f.actions || f.actions.length === 0)
    );

    if (filesWithoutActions.length > 0) {
      const fileNames = filesWithoutActions.map(f => `• ${f.name}`).join('\n');
      throw new Error(
        `⚠️ ALERTA: Los siguientes archivos no tienen acciones seleccionadas:\n\n${fileNames}\n\nPor favor, haz click en "📝 Transcribir" primero.`
      );
    }

    // Validate files have blob URLs
    const filesWithoutUrl = filesToProcess.filter(
      f => f.status === 'pending' && !f.blobUrl
    );

    if (filesWithoutUrl.length > 0) {
      throw new Error('Algunos archivos no se cargaron correctamente. Por favor, recárgalos.');
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process files with "Transcribir" action
    for (const file of filesToProcess) {
      if (file.status !== 'pending') continue;
      if (!file.actions?.includes('Transcribir')) continue;

      try {
        logger.info('Processing file', {
          fileId: file.id,
          filename: file.name,
          actions: file.actions
        });

        const response = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            audioUrl: file.blobUrl,
            filename: file.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json();

          // Handle quota exceeded
          if (errorData.code === 'QUOTA_EXCEEDED') {
            throw new Error(errorData.error);
          }

          throw new Error(errorData.error || 'Error al procesar');
        }

        const data = await response.json();
        console.log('[useFileProcessing] Full API response:', data);

        // API wraps response in { success, data, message }
        const jobId = data.data?.jobId || data.jobId;

        console.log('[useFileProcessing] Extracted jobId:', jobId);
        console.log('[useFileProcessing] data.data:', data.data);
        console.log('[useFileProcessing] data.jobId:', data.jobId);

        if (!jobId) {
          throw new Error('No se recibió jobId del servidor');
        }

        logger.info('Job created successfully', {
          fileId: file.id,
          jobId
        });

        onUpdate(file.id, {
          status: 'pending',
          jobId
        });

        processedCount++;
      } catch (error) {
        logger.error('File processing error', error, {
          fileId: file.id,
          filename: file.name
        });

        onUpdate(file.id, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Error al procesar'
        });

        errorCount++;

        // If it's a quota error, stop processing more files
        if (error instanceof Error && error.message.includes('límite')) {
          throw error;
        }
      }
    }

    logger.info('Processing completed', {
      processed: processedCount,
      errors: errorCount
    });

    // Clear selection after processing
    deselectAll();

    return { processed: processedCount, errors: errorCount };
  }, [selectedFileIds, deselectAll]);

  return {
    selectedFileIds,
    selectFile,
    selectAll,
    deselectAll,
    applyAction,
    processFiles,
  };
}
