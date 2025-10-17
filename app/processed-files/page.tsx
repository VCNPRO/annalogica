'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Download } from 'lucide-react';
import jsPDF from 'jspdf'; // Assuming jsPDF is used for PDF generation
import { useNotification } from '@/hooks/useNotification';
import { Toast } from '@/components/Toast';

interface ProcessedJob {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  txt_url?: string;
  srt_url?: string;
  vtt_url?: string;
  summary_url?: string;
  speakers_url?: string;
  metadata?: {
    tags?: string[];
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function ProcessedFilesPage() {
  const router = useRouter();
  const { notification, showNotification } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Assuming dark mode state is managed here
  const [processedJobs, setProcessedJobs] = useState<ProcessedJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Load user from localStorage and check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('Error verifying authentication:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Fetch processed jobs
  useEffect(() => {
    if (user) {
      const fetchJobs = async () => {
        try {
          const res = await fetch('/api/processed-files', {
            credentials: 'include'
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Error fetching processed files');
          }

          const data = await res.json();
          setProcessedJobs(data.jobs);
        } catch (err: any) {
          console.error('Error fetching processed jobs:', err);
          setError(err.message);
        }
      };
      fetchJobs();
    }
  }, [user]);

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleAllJobs = () => {
    if (selectedJobs.size === processedJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(processedJobs.map(j => j.id)));
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo procesado y todos sus resultados?')) {
      return;
    }

    try {
      const res = await fetch(`/api/processed-files/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error deleting processed file');
      }

      setProcessedJobs(prev => prev.filter(job => job.id !== jobId));
      showNotification('Archivo procesado eliminado correctamente.', 'success');
    } catch (err: any) {
      console.error('Error deleting job:', err);
      showNotification(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedJobs.size === 0) {
      showNotification('No hay archivos seleccionados', 'error');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedJobs.size} archivo(s) seleccionado(s)?`)) {
      return;
    }

    const deletePromises = Array.from(selectedJobs).map(async (jobId) => {
      try {
        const res = await fetch(`/api/processed-files/${jobId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Error al eliminar');
        return { jobId, success: true };
      } catch {
        return { jobId, success: false };
      }
    });

    const results = await Promise.all(deletePromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    setProcessedJobs(prev => prev.filter(job => !successful.some(r => r.jobId === job.id)));
    setSelectedJobs(new Set());

    if (failed.length === 0) {
      showNotification(`${successful.length} archivo(s) eliminado(s) correctamente`, 'success');
    } else {
      showNotification(`${successful.length} eliminado(s), ${failed.length} fallaron`, 'error');
    }
  };

  // Helper function to format file size (copied from app/page.tsx for consistency)
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  // Helper function to generate PDF (copied from app/page.tsx for consistency)
  const generatePdf = async (title: string, text: string, filename: string) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Metadata
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Archivo: ${filename}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
      yPosition += 10;

      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Body
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(text, usableWidth);

      for (let i = 0; i < splitText.length; i++) {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(splitText[i], margin, yPosition);
        yPosition += 5;
      }

      return doc.output('blob');
    } catch (error) {
      console.error(`Error generando PDF para "${title}":`, error);
      throw error;
    }
  };

  // Helper to trigger download
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (job: ProcessedJob, type: 'txt' | 'srt' | 'vtt' | 'summary' | 'speakers' | 'tags', format: 'txt' | 'pdf' | 'original') => {
    let url: string | undefined;
    let filename: string = job.filename.replace(/\.[^/.]+$/, '');
    let content: string | Blob | undefined;
    let contentType: string = 'text/plain';
    let downloadFilename: string = '';
    let title: string = '';

    switch (type) {
      case 'txt':
        url = job.txt_url;
        downloadFilename = `${filename}-transcripcion`;
        title = 'Transcripción';
        break;
      case 'srt':
        url = job.srt_url;
        downloadFilename = `${filename}`;
        contentType = 'application/x-subrip';
        break;
      case 'vtt':
        url = job.vtt_url;
        downloadFilename = `${filename}`;
        contentType = 'text/vtt';
        break;
      case 'summary':
        url = job.summary_url;
        downloadFilename = `${filename}-resumen`;
        title = 'Resumen';
        break;
      case 'speakers':
        url = job.speakers_url;
        downloadFilename = `${filename}-oradores`;
        title = 'Análisis de Oradores';
        break;
      case 'tags':
        // Tags are in metadata, not a separate URL
        if (job.metadata?.tags && job.metadata.tags.length > 0) {
          content = `Tags para: ${job.filename}\n\n- ${job.metadata.tags.join('\n- ')}`;
          downloadFilename = `${filename}-tags`;
          title = 'Tags';
        }
        break;
      default:
        setError('Tipo de descarga no soportado.');
        return;
    }

    if (!url && !content) {
      setError(`No hay contenido disponible para ${type}.`);
      return;
    }

    try {
      if (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error al obtener ${type} desde ${url}`);
        content = await res.text(); // Most outputs are text
      }

      if (!content) {
        setError(`Contenido vacío para ${type}.`);
        return;
      }

      if (format === 'pdf' && (type === 'txt' || type === 'summary' || type === 'speakers' || type === 'tags')) {
        const pdfBlob = await generatePdf(title, content as string, job.filename);
        triggerDownload(pdfBlob, `${downloadFilename}.pdf`);
      } else if (format === 'txt' && (type === 'txt' || type === 'summary' || type === 'speakers' || type === 'tags')) {
        const txtBlob = new Blob([content as string], { type: contentType });
        triggerDownload(txtBlob, `${downloadFilename}.txt`);
      } else if (format === 'original' && (type === 'srt' || type === 'vtt')) {
        // For SRT/VTT, download original blob directly
        const blobContent = await (await fetch(url!)).blob();
        triggerDownload(blobContent, `${downloadFilename}.${type}`);
      } else {
        setError('Formato de descarga no válido para este tipo de archivo.');
      }
    } catch (err: any) {
      console.error(`Error al descargar ${type}:`, err);
      setError(`Error al descargar ${type}: ${err.message}`);
    }
  };


  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Toast notification={notification} />

      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Pre-producción Beta-tester - Usuario: {user?.name || user?.email || 'Usuario'}
      </div>

      <div className="flex pt-16" style={{ height: '100vh' }}>
        {/* Sidebar - similar to app/page.tsx */}
        <div className="bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col" style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
          <div className="flex flex-col mb-6">
            <div className="flex items-baseline gap-x-3">
              <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
              <span className="text-white">trabajando para</span>
            </div>
            {(user?.name || user?.email) && (
              <p className="text-white -mt-1 ml-1">{user.name || user.email}</p>
            )}
          </div>

          <nav className="flex flex-col space-y-2">
            <Link href="/" className="flex items-center gap-2 p-3 rounded-lg hover:bg-zinc-800 text-white">
              <span className="text-orange-500">📁</span>
              <span>Cargar y Procesar</span>
            </Link>
            <Link href="/processed-files" className="flex items-center gap-2 p-3 rounded-lg bg-black text-white font-medium">
              <span className="text-green-500">✅</span>
              <span>Archivos Procesados</span>
            </Link>
            {/* Add other navigation links as needed */}
          </nav>

          <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-zinc-500">
              annalogica by videoconversion digital lab, S.L.
            </p>
            <p className="text-xs text-zinc-500">
              From Barcelona with love
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-6 text-white">Archivos Procesados</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {processedJobs.length === 0 ? (
            <div className="p-6 text-center bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-zinc-400">No hay archivos procesados aún.</p>
            </div>
          ) : (
            <>
              {selectedJobs.size > 0 && (
                <div className="mb-4 flex items-center justify-between bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                  <span className="text-white">
                    {selectedJobs.size} archivo(s) seleccionado(s)
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Seleccionados
                  </button>
                </div>
              )}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-700">
                  <thead className="bg-zinc-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedJobs.size === processedJobs.length && processedJobs.length > 0}
                          onChange={toggleAllJobs}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Archivo Original
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Descargas
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {processedJobs.map((job) => (
                      <tr key={job.id} className="bg-zinc-900 hover:bg-zinc-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedJobs.has(job.id)}
                            onChange={() => toggleJobSelection(job.id)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {job.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                          {job.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                          {new Date(job.created_at).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-2">
                            {job.txt_url && (
                              <>
                                <button
                                  onClick={() => handleDownload(job, 'txt', 'txt')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> TXT
                                </button>
                                <button
                                  onClick={() => handleDownload(job, 'txt', 'pdf')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> PDF
                                </button>
                              </>
                            )}
                            {job.srt_url && (
                              <button
                                onClick={() => handleDownload(job, 'srt', 'original')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <Download className="h-3 w-3 mr-1" /> SRT
                              </button>
                            )}
                            {job.vtt_url && (
                              <button
                                onClick={() => handleDownload(job, 'vtt', 'original')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                              >
                                <Download className="h-3 w-3 mr-1" /> VTT
                              </button>
                            )}
                            {job.summary_url && (
                              <>
                                <button
                                  onClick={() => handleDownload(job, 'summary', 'txt')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Resumen TXT
                                </button>
                                <button
                                  onClick={() => handleDownload(job, 'summary', 'pdf')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Resumen PDF
                                </button>
                              </>
                            )}
                            {job.speakers_url && (
                              <>
                                <button
                                  onClick={() => handleDownload(job, 'speakers', 'txt')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Oradores TXT
                                </button>
                                <button
                                  onClick={() => handleDownload(job, 'speakers', 'pdf')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Oradores PDF
                                </button>
                              </>
                            )}
                            {job.metadata?.tags && job.metadata.tags.length > 0 && (
                              <>
                                <button
                                  onClick={() => handleDownload(job, 'tags', 'txt')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Tags TXT
                                </button>
                                <button
                                  onClick={() => handleDownload(job, 'tags', 'pdf')}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700"
                                >
                                  <Download className="h-3 w-3 mr-1" /> Tags PDF
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar archivo procesado"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
