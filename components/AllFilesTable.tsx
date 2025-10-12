'use client';

import { formatElapsedTime, formatTimeRemaining, formatFileSize } from '@/hooks';
import type { UploadedFile } from '@/types/file';

interface AllFilesTableProps {
  files: UploadedFile[];
  selectedFileIds: Set<string>;
  darkMode: boolean;
  downloadFormat: 'txt' | 'pdf';
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRemoveFile: (fileId: string) => void;
  onDownload: (file: UploadedFile) => void;
  onDownloadFormatChange: (format: 'txt' | 'pdf') => void;
  onReset: () => void;
}

export default function AllFilesTable({
  files,
  selectedFileIds,
  darkMode,
  downloadFormat,
  onSelectFile,
  onSelectAll,
  onDeselectAll,
  onRemoveFile,
  onDownload,
  onDownloadFormatChange,
  onReset,
}: AllFilesTableProps) {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  const allSelected = files.length > 0 && files.every(f => selectedFileIds.has(f.id));

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
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
            ✓ Completado
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
    <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden`} style={{ flex: '1 1 100%', minHeight: '500px' }}>
      {/* Header */}
      <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => allSelected ? onDeselectAll() : onSelectAll()}
              className="form-checkbox h-4 w-4 text-orange-500 rounded"
            />
            <span className="text-orange-500 text-sm">📁</span>
            <h2 className={`text-sm font-medium ${textPrimary}`}>Archivos Cargados</h2>
          </div>
          <p className={`text-xs ${textSecondary}`}>Archivos en proceso de subida y procesamiento</p>

          {/* Download format selector - show only when there are completed files */}
          {files.some(f => f.status === 'completed') && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs ${textSecondary}`}>Formato descarga:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  className="accent-orange-500 scale-75"
                  name="downloadFormat"
                  checked={downloadFormat === 'txt'}
                  onChange={() => onDownloadFormatChange('txt')}
                />
                <span className={`text-xs ${textSecondary}`}>TXT</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  className="accent-orange-500 scale-75"
                  name="downloadFormat"
                  checked={downloadFormat === 'pdf'}
                  onChange={() => onDownloadFormatChange('pdf')}
                />
                <span className={`text-xs ${textSecondary}`}>PDF</span>
              </label>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
            title="Reiniciar - Limpiar todo y empezar de nuevo"
          >
            🔄 Reiniciar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-xs ${textSecondary}`}>No hay archivos cargados aún.</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="checkbox"
                  checked={selectedFileIds.has(file.id)}
                  onChange={() => onSelectFile(file.id)}
                  className="form-checkbox h-4 w-4 text-orange-500 rounded"
                  disabled={file.status === 'processing' || file.status === 'uploading'}
                />
                <span className="mr-2">{getFileIcon(file.fileType)}</span>
                <span className={`text-xs ${textPrimary} flex-1 truncate`}>{file.name}</span>
                {file.actions && file.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {file.actions.map(action => (
                      <span key={action} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        {action}
                      </span>
                    ))}
                  </div>
                )}
                {getStatusBadge(file)}
                <div className="flex items-center gap-2">
                  {file.status === 'completed' && (
                    <button
                      onClick={() => onDownload(file)}
                      className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      📥
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className={`text-red-500 hover:text-red-600 text-sm ${
                      file.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={file.status === 'processing'}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress section */}
              <div className="ml-10 space-y-1">
                {file.status === 'uploading' && file.uploadProgress !== undefined && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs ${textSecondary}`}>Subida</span>
                      <span className="text-xs text-blue-500">{file.uploadProgress.toFixed(0)}%</span>
                    </div>
                    <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
                      <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${file.uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                {file.status === 'processing' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs ${textSecondary}`}>
                        {(file.processingProgress || 0) >= 90 ? '🟡 Finalizando...' : 'Procesando'}
                      </span>
                      <span className="text-xs text-purple-500">{file.processingProgress || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs ${textSecondary}`}>
                        ⏱️ {formatElapsedTime(file.processingStartTime)}
                      </span>
                      {file.estimatedTimeRemaining !== undefined && file.estimatedTimeRemaining > 0 && (
                        <span className={`text-xs ${textSecondary}`}>
                          ⏳ ~{formatTimeRemaining(file.estimatedTimeRemaining)}
                        </span>
                      )}
                    </div>
                    <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
                      <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${file.processingProgress || 0}%` }} />
                    </div>
                  </div>
                )}
                {file.status === 'error' && file.errorMessage && (
                  <div className="text-red-600 text-xs">
                    {file.errorMessage}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
