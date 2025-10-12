'use client';

import type { ChangeEvent, DragEvent } from 'react';

interface FileUploadZoneProps {
  darkMode: boolean;
  uploading: boolean;
  uploadError: string | null;
  processingError: string | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
}

export default function FileUploadZone({
  darkMode,
  uploading,
  uploadError,
  processingError,
  onFileChange,
  onDrop,
  onDragOver,
}: FileUploadZoneProps) {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';

  return (
    <div className="mb-6">
      <div
        className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors`}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-orange-500 text-sm">📁</span>
          <h2 className={`text-sm font-medium ${textPrimary}`}>Carga de Archivos</h2>
        </div>
        <p className={`text-xs ${textSecondary} mb-3`}>
          Archivos admitidos: Audio, Video, TXT, DOCX, PDF.
        </p>
        <div className={`${textSecondary} mb-3`}>
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className={`text-xs ${textSecondary} mb-1`}>Arrastra y suelta hasta 50 archivos aquí</p>
        <p className={`text-xs ${textSecondary} mb-2`}>o</p>
        <label>
          <span className="text-orange-500 text-xs font-medium hover:text-orange-600 cursor-pointer">
            Selecciona archivos de tu equipo
          </span>
          <input
            type="file"
            multiple
            className="hidden"
            accept="audio/*,video/*,.txt,.docx,.pdf"
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {(uploadError || processingError) && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs text-red-700">{uploadError || processingError}</p>
        </div>
      )}
    </div>
  );
}
