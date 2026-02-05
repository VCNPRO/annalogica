'use client';

import { X, Download, FileText } from 'lucide-react';

interface PdfViewerUrlProps {
  url: string;
  filename?: string;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isImage(url: string): boolean {
  const lower = url.split('?')[0].toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isPdf(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
}

export default function PdfViewerUrl({ url, filename, onClose }: PdfViewerUrlProps) {
  const displayName = filename || url.split('/').pop()?.split('?')[0] || 'Archivo';
  const showAsImage = isImage(url);
  const showAsPdf = isPdf(url);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = displayName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col w-[90vw] h-[90vh] max-w-5xl rounded-xl border bg-[#f0f4f8] border-[#cbd5e1] dark:bg-gray-900 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#cbd5e1] dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 flex-shrink-0 text-[#1e293b] dark:text-gray-300" />
            <span className="truncate text-sm font-medium text-[#1e293b] dark:text-gray-200">
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-[#cbd5e1] dark:hover:bg-gray-700 transition-colors"
              title="Descargar"
            >
              <Download className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#cbd5e1] dark:hover:bg-gray-700 transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2">
          {showAsImage ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={url}
                alt={displayName}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          ) : (
            <iframe
              src={url}
              title={displayName}
              className="w-full h-full rounded border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
