'use client';

import { useState, useRef } from 'react';

export default function AudioUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [summaryType, setSummaryType] = useState('detailed');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('summaryType', summaryType);

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir el archivo');
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
          id="audio-upload"
        />
        
        <label
          htmlFor="audio-upload"
          className="cursor-pointer flex flex-col items-center space-y-4"
        >
          <div className="bg-blue-50 p-4 rounded-full">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {file ? file.name : 'Selecciona un archivo de audio'}
            </p>
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </p>
            )}
            {!file && (
              <p className="text-sm text-gray-500 mt-1">
                MP3, WAV, M4A, OGG, FLAC o WebM - Máx. 25MB
              </p>
            )}
          </div>
          
          {!file && (
            <button
              type="button"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Seleccionar archivo
            </button>
          )}
        </label>
      </div>

      {file && !result && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de resumen
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="summaryType"
                value="short"
                checked={summaryType === 'short'}
                onChange={(e) => setSummaryType(e.target.value)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm text-gray-700">Breve</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="summaryType"
                value="detailed"
                checked={summaryType === 'detailed'}
                onChange={(e) => setSummaryType(e.target.value)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm text-gray-700">Detallado</span>
            </label>
          </div>
        </div>
      )}

      {file && !result && (
        <div className="flex space-x-4">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Procesando...' : 'Transcribir Audio'}
          </button>
          
          {!uploading && (
            <button
              onClick={resetUpload}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-green-900">
                Archivo subido correctamente
              </h3>
              <p className="text-sm text-green-700 mt-1">
                {result.message}
              </p>
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>ID:</strong> {result.jobId}</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={resetUpload}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Transcribir otro
            </button>
            
              href={'/transcriptions/' + result.jobId}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center block leading-6"
            >
              Ver progreso
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={resetUpload}
            className="mt-4 w-full px-6 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-red-700"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
