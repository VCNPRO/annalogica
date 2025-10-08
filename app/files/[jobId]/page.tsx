'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Define a more specific type for our job object
interface Job {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  metadata: {
    speakers?: string[];
    tags?: string[];
  };
  txt_url?: string;
  srt_url?: string;
  vtt_url?: string;
  summary_url?: string;
  audio_duration_seconds?: number;
}

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

// Using 'props: any' as a workaround for a persistent Next.js build error.
export default function FileDetailsPage(props: any) {
  const { jobId } = props.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  useEffect(() => {
        const fetchJob = async () => {
          const token = localStorage.getItem('token');
          if (!token) {
            setError('No autenticado. Por favor, inicia sesión de nuevo.');
            router.push('/login');
            return;
          }

          try {
            const res = await fetch(`/api/jobs/${jobId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'No se pudieron obtener los detalles del trabajo.');
        }
        const data = await res.json();
        setJob(data.job);
        console.log('Job data received:', data.job); // DEBUG LOG
      } catch (e: any) {
        setError(e.message);
      }
    };

    fetchJob().finally(() => setLoading(false));

    // Set up polling to refresh job status periodically
    const interval = setInterval(fetchJob, 5000); // every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [jobId]);

  const startTask = async (task: 'transcribe' | 'summarize') => {
    setIsTaskRunning(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, task }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al iniciar la tarea.');
      }
      alert(`Tarea '${task}' iniciada. La página se actualizará automáticamente.`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsTaskRunning(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500">Cargando...</div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">Error: {error}</div>;
  if (!job) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Trabajo no encontrado.</div>;

  const isTranscribed = job.status === 'transcribed' || job.status === 'summarized' || job.status === 'completed' || !!job.summary_url;
  const isSummarized = !!job.summary_url;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/results" className="text-blue-500 hover:underline">&larr; Volver a todos los archivos</Link>
          <h1 className="text-3xl font-bold mt-2 truncate">{job.filename}</h1>
          <p className="text-sm text-zinc-400">Creado: {formatDate(job.created_at)}</p>
        </div>

        <div className="space-y-6">
          {/* Transcription Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold">Transcripción</h2>
            <p className="text-sm text-zinc-400 mb-4">Estado: <span className="font-semibold text-orange-400">{job.status}</span></p>
            {!isTranscribed && job.status !== 'processing' && (
              <button onClick={() => startTask('transcribe')} disabled={isTaskRunning} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md disabled:opacity-50">
                {isTaskRunning ? 'Procesando...' : 'Iniciar Transcripción'}
              </button>
            )}
            {isTranscribed && (
              <div>
                <h3 className="font-semibold mb-2">Descargas:</h3>
                <div className="flex gap-4">
                  <a href={job.txt_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">TXT</a>
                  <a href={job.srt_url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">SRT</a>
                  {job.vtt_url && <a href={job.vtt_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">VTT</a>}
                </div>
              </div>
            )}
          </div>

          {/* Summary & Metadata Card */}
          <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-6 ${!isTranscribed && 'opacity-50'}`}>
            <h2 className="text-xl font-semibold">Análisis IA (Resumen, Tags, Intervinientes)</h2>
            {!isTranscribed && <p className="text-sm text-zinc-500 mt-2">Completa la transcripción para activar esta sección.</p>}
            {isTranscribed && (
              <div className="mt-4 space-y-4">
                {!isSummarized && job.status !== 'processing' && (
                  <button onClick={() => startTask('summarize')} disabled={isTaskRunning} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md disabled:opacity-50">
                    {isTaskRunning ? 'Procesando...' : 'Generar Resumen y Tags'}
                  </button>
                )}
                {isSummarized && (
                  <div>
                    <h3 className="font-semibold mb-2">Resumen:</h3>
                     <a href={job.summary_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Descargar Resumen (.txt)</a>
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="font-semibold">Metadatos Extraídos:</h3>
                  <div className="text-sm text-zinc-300 space-y-2 mt-2">
                    <p><strong>Intervinientes:</strong> {job.metadata?.speakers?.join(', ') || 'No detectados'}</p>
                    <p><strong>Tags:</strong> {job.metadata?.tags?.join(', ') || 'No generados'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}