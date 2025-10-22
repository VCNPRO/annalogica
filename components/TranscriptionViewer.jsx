// components/TranscriptionViewer.jsx
'use client';

import { useTranscriptionPolling } from '@/hooks/useTranscriptionPolling';

export default function TranscriptionViewer({ jobId }) {
  const { job, loading, error } = useTranscriptionPolling({
    jobId,
    enabled: true,
    onComplete: (job) => {
      console.log('✅ Transcripción completada:', job.id);
    },
    onError: (err) => {
      console.error('❌ Error:', err);
    }
  });

  // Loading inicial
  if (loading && !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error && !job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-medium text-red-900">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  // Procesando
  if (job.status === 'processing' || job.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Procesando {job.fileName}
            </h2>
            <p className="text-gray-600">
              Esto puede tardar varios minutos...
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progreso</span>
              <span className="font-medium">{job.processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${job.processingProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>¿Qué estamos haciendo?</strong><br />
              Transcribiendo audio, identificando intervinientes, generando resumen y tags, y creando subtítulos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error en procesamiento
  if (job.status === 'error') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-medium text-red-900">Error al procesar</h3>
          <p className="text-sm text-red-700 mt-1">
            {job.errorMessage || 'Ocurrió un error desconocido'}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Archivo:</strong> {job.fileName}
          </p>
        </div>
      </div>
    );
  }

  // Completado
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {job.fileName}
            </h1>
            {job.duration && (
              <div className="flex items-center text-gray-600 text-sm space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Duración: {formatDuration(job.duration)}</span>
              </div>
            )}
          </div>
          
          {/* Botones de descarga */}
          <div className="flex space-x-2">
            {job.srtUrl && (
              
                href={job.srtUrl}
                download
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                ↓ SRT
              </a>
            )}
            {job.vttUrl && (
              
                href={job.vttUrl}
                download
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                ↓ VTT
              </a>
            )}
            {job.txtUrl && (
              
                href={job.txtUrl}
                download
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
              >
                ↓ TXT
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Resumen */}
          {job.summaryUrl && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Resumen</h2>
              <iframe
                src={job.summaryUrl}
                className="w-full h-64 border rounded"
                title="Resumen"
              />
              
                href={job.summaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm mt-2 inline-block"
              >
                Abrir en nueva pestaña →
              </a>
            </div>
          )}

          {/* Transcripción */}
          {job.txtUrl && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Transcripción Completa</h2>
              <iframe
                src={job.txtUrl}
                className="w-full h-96 border rounded"
                title="Transcripción"
              />
              
                href={job.txtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm mt-2 inline-block"
              >
                Abrir en nueva pestaña →
              </a>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          
          {/* Intervinientes */}
          {job.speakersUrl && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 Intervinientes</h2>
              <iframe
                src={job.speakersUrl}
                className="w-full h-48 border rounded"
                title="Intervinientes"
              />
              
                href={job.speakersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm mt-2 inline-block"
              >
                Ver detalles →
              </a>
            </div>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Etiquetas</h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Información</h3>
            <div className="space-y-2 text-sm">
              {job.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-medium text-gray-900">{formatDuration(job.duration)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="font-medium text-green-600">✓ Completado</span>
              </div>
              {job.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(job.completedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
