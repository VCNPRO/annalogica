'use client';

import { formatElapsedTime, formatTimeRemaining, formatFileSize } from '@/hooks';
import type { UploadedFile } from '@/types/file';

interface FileListTableProps {
  files: UploadedFile[];
  selectedFileIds: Set<string>;
  darkMode: boolean;
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRemoveFile: (fileId: string) => void;
}

export default function FileListTable({
  files,
  selectedFileIds,
  darkMode,
  onSelectFile,
  onSelectAll,
  onDeselectAll,
  onRemoveFile,
}: FileListTableProps) {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  const activeFiles = files.filter(f => f.status !== 'completed');
  const allSelected = activeFiles.length > 0 && activeFiles.every(f => selectedFileIds.has(f.id));

  if (activeFiles.length === 0) {
    return (
      <div className={`${bgSecondary} rounded-lg ${border} border p-6 text-center mb-6`}>
        <p className={`${textSecondary} text-sm`}>
          No hay archivos pendientes. Carga archivos para empezar.
        </p>
      </div>
    );
  }

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return (
          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
            Subiendo {file.uploadProgress}%
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
            Pendiente
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
            Procesando {file.processingProgress}%
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      case 'text':
        return '📄';
      default:
        return '📎';
    }
  };

  return (
    <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden mb-6`}>
      {/* Header */}
      <div className={`p-4 ${border} border-b flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <h2 className={`text-sm font-medium ${textPrimary}`}>
            Archivos Pendientes ({activeFiles.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-xs text-orange-500 hover:text-orange-600"
            >
              Seleccionar todos
            </button>
            <span className={`text-xs ${textSecondary}`}>|</span>
            <button
              onClick={onDeselectAll}
              className="text-xs text-orange-500 hover:text-orange-600"
            >
              Deseleccionar todos
            </button>
          </div>
        </div>
        {selectedFileIds.size > 0 && (
          <span className={`text-xs ${textSecondary}`}>
            {selectedFileIds.size} seleccionado(s)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className={`${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <tr>
              <th className="p-3 text-left w-12">
                <input
                  type="checkbox"
                  className="accent-orange-500"
                  checked={allSelected}
                  onChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                />
              </th>
              <th className={`p-3 text-left ${textSecondary}`}>Archivo</th>
              <th className={`p-3 text-left ${textSecondary}`}>Tipo</th>
              <th className={`p-3 text-left ${textSecondary}`}>Tamaño</th>
              <th className={`p-3 text-left ${textSecondary}`}>Estado</th>
              <th className={`p-3 text-left ${textSecondary}`}>Progreso</th>
              <th className={`p-3 text-left ${textSecondary}`}>Acciones Aplicadas</th>
              <th className={`p-3 text-left ${textSecondary}`}>Tiempo</th>
              <th className={`p-3 text-left ${textSecondary}`}></th>
            </tr>
          </thead>
          <tbody>
            {activeFiles.map(file => (
              <tr
                key={file.id}
                className={`${border} border-b last:border-b-0 hover:${darkMode ? 'bg-zinc-800/50' : 'bg-gray-50'}`}
              >
                {/* Checkbox */}
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={selectedFileIds.has(file.id)}
                    onChange={() => onSelectFile(file.id)}
                    disabled={file.status === 'processing' || file.status === 'uploading'}
                  />
                </td>

                {/* File name */}
                <td className={`p-3 ${textPrimary} max-w-xs truncate`} title={file.name}>
                  <span className="mr-2">{getFileIcon(file.fileType)}</span>
                  {file.name}
                </td>

                {/* File type */}
                <td className={`p-3 ${textSecondary} capitalize`}>
                  {file.fileType}
                </td>

                {/* File size */}
                <td className={`p-3 ${textSecondary}`}>
                  {formatFileSize(file.fileSize)}
                </td>

                {/* Status */}
                <td className="p-3">
                  {getStatusBadge(file)}
                </td>

                {/* Progress */}
                <td className="p-3">
                  {file.status === 'processing' && file.processingProgress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${file.processingProgress}%` }}
                      />
                    </div>
                  )}
                  {file.status === 'uploading' && file.uploadProgress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${file.uploadProgress}%` }}
                      />
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className={`p-3 ${textSecondary}`}>
                  {file.actions && file.actions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {file.actions.map(action => (
                        <span
                          key={action}
                          className="px-2 py-0.5 text-[10px] rounded bg-orange-100 text-orange-700"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-[10px]">Sin acciones</span>
                  )}
                </td>

                {/* Time */}
                <td className={`p-3 ${textSecondary}`}>
                  {file.status === 'processing' && file.processingStartTime && (
                    <div className="text-[10px]">
                      <div>⏱️ {formatElapsedTime(file.processingStartTime)}</div>
                      {file.estimatedTimeRemaining !== undefined && (
                        <div className="text-zinc-500">
                          ~{formatTimeRemaining(file.estimatedTimeRemaining)}
                        </div>
                      )}
                    </div>
                  )}
                  {file.status === 'error' && file.errorMessage && (
                    <div className="text-red-600 text-[10px]" title={file.errorMessage}>
                      {file.errorMessage.substring(0, 30)}...
                    </div>
                  )}
                </td>

                {/* Remove button */}
                <td className="p-3">
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className={`text-red-500 hover:text-red-600 ${
                      file.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={file.status === 'processing'}
                    title="Eliminar archivo"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
