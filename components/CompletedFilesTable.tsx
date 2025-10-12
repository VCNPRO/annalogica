'use client';

import { formatFileSize } from '@/hooks';
import type { UploadedFile } from '@/types/file';

interface CompletedFilesTableProps {
  files: UploadedFile[];
  darkMode: boolean;
  downloadFormat: 'txt' | 'pdf';
  onDownloadFormatChange: (format: 'txt' | 'pdf') => void;
  onDownload: (file: UploadedFile) => void;
  onRemoveFile: (fileId: string) => void;
}

export default function CompletedFilesTable({
  files,
  darkMode,
  downloadFormat,
  onDownloadFormatChange,
  onDownload,
  onRemoveFile,
}: CompletedFilesTableProps) {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  const completedFiles = files.filter(f => f.status === 'completed');

  if (completedFiles.length === 0) {
    return null;
  }

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
    <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 ${border} border-b flex items-center justify-between`}>
        <h2 className={`text-sm font-medium ${textPrimary}`}>
          Archivos Completados ({completedFiles.length})
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${textSecondary}`}>Formato de descarga:</span>
          <div className="flex gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                className="accent-orange-500 scale-75"
                name="downloadFormat"
                checked={downloadFormat === 'txt'}
                onChange={() => onDownloadFormatChange('txt')}
              />
              <span className={textSecondary}>TXT</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                className="accent-orange-500 scale-75"
                name="downloadFormat"
                checked={downloadFormat === 'pdf'}
                onChange={() => onDownloadFormatChange('pdf')}
              />
              <span className={textSecondary}>PDF</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className={`${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <tr>
              <th className={`p-3 text-left ${textSecondary}`}>Archivo</th>
              <th className={`p-3 text-left ${textSecondary}`}>Tipo</th>
              <th className={`p-3 text-left ${textSecondary}`}>Tamaño</th>
              <th className={`p-3 text-left ${textSecondary}`}>Fecha</th>
              <th className={`p-3 text-left ${textSecondary}`}>Estado</th>
              <th className={`p-3 text-left ${textSecondary}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {completedFiles.map(file => (
              <tr
                key={file.id}
                className={`${border} border-b last:border-b-0 hover:${darkMode ? 'bg-zinc-800/50' : 'bg-gray-50'}`}
              >
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

                {/* Date */}
                <td className={`p-3 ${textSecondary}`}>
                  {file.date}
                </td>

                {/* Status */}
                <td className="p-3">
                  <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                    ✓ Completado
                  </span>
                </td>

                {/* Actions */}
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDownload(file)}
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors"
                      title={`Descargar como ${downloadFormat.toUpperCase()}`}
                    >
                      📥 Descargar
                    </button>
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="text-red-500 hover:text-red-600"
                      title="Eliminar archivo"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
