// hooks/useTranscriptionPolling.js
import { useState, useEffect, useRef } from 'react';

export function useTranscriptionPolling({
  jobId,
  enabled = true,
  intervalMs = 2000,
  onComplete,
  onError
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/transcriptions/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener el trabajo');
      }

      const data = await response.json();
      setJob(data);
      setError(null);

      // Si está completado o con error, detener polling
      if (data.status === 'completed') {
        stopPolling();
        onComplete?.(data);
      } else if (data.status === 'error') {
        stopPolling();
        setError(data.errorMessage || 'Error al procesar');
        onError?.(data.errorMessage);
      }

    } catch (err) {
      console.error('Error en polling:', err);
      setError(err.message);
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    fetchJob();
    intervalRef.current = setInterval(fetchJob, intervalMs);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled && jobId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [jobId, enabled]);

  return {
    job,
    loading,
    error,
    refetch: fetchJob,
    stopPolling
  };
}

// Hook simplificado para solo obtener progreso
export function useTranscriptionProgress(jobId, enabled = true) {
  const { job, loading, error } = useTranscriptionPolling({
    jobId,
    enabled
  });

  return {
    progress: job?.processingProgress || 0,
    status: job?.status || 'pending',
    loading,
    error
  };
}
