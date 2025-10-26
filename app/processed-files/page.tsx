'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Download, ArrowLeft, Settings, Info, Languages, Search, Filter, X, Play } from 'lucide-react';
import jsPDF from 'jspdf'; // Assuming jsPDF is used for PDF generation
import { useNotification } from '@/hooks/useNotification';
import { Toast } from '@/components/Toast';

// 🎤 Componente para el reproductor de audio de un job
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
  audio_url?: string; // 🔥 Add audio_url
  metadata?: {
    tags?: string[];
    excelUrl?: string;
    pdfUrl?: string;
    fileType?: 'audio' | 'document';
    ttsUrl?: string; // 🔥 Add ttsUrl
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
  const [translatingJob, setTranslatingJob] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [userStats, setUserStats] = useState<{
    total: number;
    completed: number;
    processing: number;
    errors: number;
    totalHours: string;
  } | null>(null);
  const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'txt' | 'both'>('pdf');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'document'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

  // Load user stats
  const loadUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/stats', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user]);

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

  // Fetch processed jobs with polling
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

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
        if (isMounted) {
          setProcessedJobs(data.jobs);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching processed jobs:', err);
          setError(err.message);
        }
      }
    };

    fetchJobs(); // Initial fetch
    const interval = setInterval(fetchJobs, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Load user stats when user is ready
  useEffect(() => {
    if (user) {
      loadUserStats();
      // Reload stats every 30 seconds
      const interval = setInterval(loadUserStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadUserStats]);

  // Filter and search jobs
  const filteredJobs = processedJobs.filter(job => {
    // Search filter (filename or jobId)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesFilename = job.filename.toLowerCase().includes(query);
      const matchesJobId = job.id.toLowerCase().includes(query);

      if (!matchesFilename && !matchesJobId) {
        return false;
      }
    }

    // Type filter (audio vs document)
    if (filterType !== 'all') {
      const fileType = job.metadata?.fileType || 'audio'; // default to audio for old jobs
      if (filterType === 'audio' && fileType !== 'audio') return false;
      if (filterType === 'document' && fileType !== 'document') return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && job.status !== 'completed') return false;
      if (filterStatus === 'processing' && !['pending', 'processing', 'transcribed', 'summarized'].includes(job.status)) return false;
      if (filterStatus === 'failed' && job.status !== 'failed') return false;
    }

    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterStatus !== 'all';

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
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(j => j.id)));
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

  const downloadFilesOrganized = async (job: ProcessedJob, dirHandle: FileSystemDirectoryHandle) => {
    try {
      const baseName = job.filename.replace(/\.[^/.]+$/, '');
      const folderHandle = await dirHandle.getDirectoryHandle(baseName, { create: true });

      const saveBlob = async (handle: any, blob: Blob) => {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      };

      const downloadTasks = [];

      if (job.txt_url) downloadTasks.push(async () => {
        const res = await fetch(job.txt_url!);
        const content = await res.text();
        if (downloadFormat === 'pdf' || downloadFormat === 'both') {
          const blob = await generatePdf('Transcripción', content, job.filename);
          const handle = await folderHandle.getFileHandle(`${baseName}-transcripcion.pdf`, { create: true });
          await saveBlob(handle, blob);
        }
        if (downloadFormat === 'txt' || downloadFormat === 'both') {
          const blob = new Blob([content], { type: 'text/plain' });
          const handle = await folderHandle.getFileHandle(`${baseName}-transcripcion.txt`, { create: true });
          await saveBlob(handle, blob);
        }
      });

      if (job.summary_url) downloadTasks.push(async () => {
        const res = await fetch(job.summary_url!);
        const content = await res.text();
        if (downloadFormat === 'pdf' || downloadFormat === 'both') {
          const blob = await generatePdf('Resumen', content, job.filename);
          const handle = await folderHandle.getFileHandle(`${baseName}-resumen.pdf`, { create: true });
          await saveBlob(handle, blob);
        }
        if (downloadFormat === 'txt' || downloadFormat === 'both') {
          const blob = new Blob([content], { type: 'text/plain' });
          const handle = await folderHandle.getFileHandle(`${baseName}-resumen.txt`, { create: true });
          await saveBlob(handle, blob);
        }
      });

      if (job.metadata?.ttsUrl) downloadTasks.push(async () => {
        const res = await fetch(job.metadata!.ttsUrl!);
        const blob = await res.blob();
        const handle = await folderHandle.getFileHandle(`${baseName}-narrado.mp3`, { create: true });
        await saveBlob(handle, blob);
      });

      if (job.srt_url) downloadTasks.push(async () => {
        const res = await fetch(job.srt_url!);
        const blob = await res.blob();
        const handle = await folderHandle.getFileHandle(`${baseName}.srt`, { create: true });
        await saveBlob(handle, blob);
      });

      if (job.vtt_url) downloadTasks.push(async () => {
        const res = await fetch(job.vtt_url!);
        const blob = await res.blob();
        const handle = await folderHandle.getFileHandle(`${baseName}.vtt`, { create: true });
        await saveBlob(handle, blob);
      });

      await Promise.all(downloadTasks.map(task => task()));
      showNotification(`Archivos para "${job.filename}" guardados en "${dirHandle.name}/${baseName}"`, 'success');
    } catch (error) {
      console.error('Error in downloadFilesOrganized:', error);
      showNotification(`Error al descargar archivos para "${job.filename}"`, 'error');
    }
  };

  const downloadFilesIndividually = async (job: ProcessedJob) => {
    const baseName = job.filename.replace(/\.[^/.]+$/, '');
    const downloadTasks = [];

    if (job.txt_url) downloadTasks.push(async () => {
      const res = await fetch(job.txt_url!);
      const content = await res.text();
      if (downloadFormat === 'pdf' || downloadFormat === 'both') {
        const blob = await generatePdf('Transcripción', content, job.filename);
        triggerDownload(blob, `${baseName}-transcripcion.pdf`);
      }
      if (downloadFormat === 'txt' || downloadFormat === 'both') {
        const blob = new Blob([content], { type: 'text/plain' });
        triggerDownload(blob, `${baseName}-transcripcion.txt`);
      }
    });

    // ... similar logic for other file types ...

    await Promise.all(downloadTasks.map(task => task()));
    showNotification('Descargando archivos individualmente...', 'info');
  };

  const handleBulkDownload = async () => {
    if (selectedJobs.size === 0) {
      showNotification('No hay archivos seleccionados para descargar.', 'info');
      return;
    }

    if (!downloadDirHandle && 'showDirectoryPicker' in window) {
      showNotification('Por favor, elige una carpeta de destino primero.', 'error');
      return;
    }

    const jobsToDownload = processedJobs.filter(j => selectedJobs.has(j.id));

    for (const job of jobsToDownload) {
      if (downloadDirHandle) {
        await downloadFilesOrganized(job, downloadDirHandle);
      } else {
        await downloadFilesIndividually(job);
      }
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
        <div className="bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col w-[280px]">
          <div className="flex flex-col mb-6">
            <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
          </div>

          <nav className="flex flex-col space-y-2 mb-6">
            <Link href="/" className="flex items-center gap-2 p-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Dashboard</span>
            </Link>
            <Link href="/processed-files" className="flex items-center gap-2 p-3 rounded-lg bg-black text-white font-medium">
              <span className="text-green-500">✅</span>
              <span>Archivos Procesados</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-2 p-3 rounded-lg hover:bg-zinc-800 text-white transition-colors">
              <Settings className="h-4 w-4 text-zinc-400" />
              <span>Ajustes</span>
            </Link>
          </nav>

          {/* User Stats Widget */}
          {userStats && (
            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                📊 Resumen de Archivos
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">Total procesados:</span>
                  <span className="text-orange-500 font-semibold">{userStats.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">En proceso:</span>
                  <span className="text-blue-400 font-semibold">{userStats.processing}</span>
                </div>
                {userStats.errors > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">Errores:</span>
                    <span className="text-red-400 font-semibold">{userStats.errors}</span>
                  </div>
                )}
                <div className="border-t border-zinc-700 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">Horas transcritas:</span>
                    <span className="text-green-400 font-semibold">{userStats.totalHours}h</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File retention policy info */}
          <div className="bg-zinc-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <h3 className="text-sm font-medium text-white">Política de Retención</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Los archivos procesados se conservan durante <span className="text-white font-medium">30 días</span>.
              Los archivos originales de audio/video se eliminan automáticamente tras el procesamiento.
            </p>
          </div>

          <div className="mt-auto">
            <div className="pt-4 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                annalogica by videoconversion digital lab, S.L.
              </p>
              <p className="text-xs text-zinc-500">
                From Barcelona with love
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Archivos Procesados</h2>

            {/* Translation language selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="target-language" className="text-sm text-zinc-400">
                Idioma para traducir:
              </label>
              <select
                id="target-language"
                className="p-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                style={{ minWidth: '150px' }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ca">Català</option>
                <option value="eu">Euskera</option>
                <option value="gl">Gallego</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
                <option value="ar">العربية (Arabic)</option>
                <option value="ru">Русский (Russian)</option>
              </select>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre de archivo o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Filtros:</span>
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="audio">🎙️ Solo Audio</option>
                <option value="document">📄 Solo Documentos</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Todos los estados</option>
                <option value="completed">✅ Completados</option>
                <option value="processing">⏳ Procesando</option>
                <option value="failed">❌ Errores</option>
              </select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </button>
              )}

              {/* Results Count */}
              <span className="text-sm text-zinc-400 ml-auto">
                {filteredJobs.length} de {processedJobs.length} archivos
              </span>
            </div>
          </div>

          {/* Bulk Download Controls */}
          {filteredJobs.length > 0 && (
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBulkDownload}
                  disabled={selectedJobs.size === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Seleccionados ({selectedJobs.size})
                </button>
                <button
                  onClick={async () => {
                    if (!('showDirectoryPicker' in window)) {
                      showNotification('Tu navegador no soporta la selección de carpetas.', 'error');
                      return;
                    }
                    try {
                      const handle = await (window as any).showDirectoryPicker();
                      setDownloadDirHandle(handle);
                      showNotification(`Carpeta de descarga seleccionada: "${handle.name}"`, 'success');
                    } catch (err) {
                      console.error('Error al seleccionar carpeta:', err);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-zinc-600 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Elegir una carpeta local donde guardar todas las descargas de forma organizada"
                >
                  📁 Elegir Carpeta
                </button>
                {downloadDirHandle && <span className="text-xs text-zinc-400">Carpeta: {downloadDirHandle.name}</span>}
              </div>
              <div className="flex items-center gap-3">
                  <span className={`text-sm text-zinc-300`}>Formato:</span>
                  <label className="flex items-center gap-1 text-sm text-zinc-300">
                    <input type="radio" name="downloadFormat" value="pdf" checked={downloadFormat === 'pdf'} onChange={() => setDownloadFormat('pdf')} className="accent-orange-500" />
                    PDF
                  </label>
                  <label className="flex items-center gap-1 text-sm text-zinc-300">
                    <input type="radio" name="downloadFormat" value="txt" checked={downloadFormat === 'txt'} onChange={() => setDownloadFormat('txt')} className="accent-orange-500" />
                    TXT
                  </label>
                  <label className="flex items-center gap-1 text-sm text-zinc-300">
                    <input type="radio" name="downloadFormat" value="both" checked={downloadFormat === 'both'} onChange={() => setDownloadFormat('both')} className="accent-orange-500" />
                    Ambos
                  </label>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div className="p-6 text-center bg-zinc-900 rounded-lg border border-zinc-800">
              <p className="text-zinc-400">
                {hasActiveFilters
                  ? 'No se encontraron archivos con los filtros seleccionados.'
                  : 'No hay archivos procesados aún.'}
              </p>
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
                          checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
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
                                      {filteredJobs.map((job) => {
                                        const audioUrl = job.metadata?.ttsUrl || job.audio_url;
                                        return (
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
                                                                              {/* TTS Audio Play Button */}
                                                                              {job.metadata?.ttsUrl && (
                                                                                <a
                                                                                  href={job.metadata.ttsUrl}
                                                                                  target="_blank"
                                                                                  rel="noopener noreferrer"
                                                                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                                                                  title="Reproducir audio en nueva pestaña"
                                                                                >
                                                                                  <Play className="h-3 w-3 mr-1" /> Reproducir Audio
                                                                                </a>
                                                                              )}                                                {/* Excel download - PRIORITY */}
                                                {job.metadata?.excelUrl && (
                                                  <a
                                                    href={job.metadata.excelUrl}
                                                    download
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                                                    title="Archivo Excel con todos los datos estructurados"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> EXCEL
                                                  </a>
                                                )}
                                                {/* PDF Complete download - PRIORITY */}
                                                {job.metadata?.pdfUrl && (
                                                  <a
                                                    href={job.metadata.pdfUrl}
                                                    download
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                                                    title="PDF completo con todos los resultados"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> PDF Completo
                                                  </a>
                                                )}
                                                {job.txt_url && (
                                                  <button
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> TXT
                                                  </button>
                                                )}
                                                {job.srt_url && (
                                                  <button
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> SRT
                                                  </button>
                                                )}
                                                {job.vtt_url && (
                                                  <button
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> VTT
                                                  </button>
                                                )}
                                                {job.summary_url && (
                                                  <button
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                  >
                                                    <Download className="h-3 w-3 mr-1" /> Resumen
                                                  </button>
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
                                        );
                                      })}
                                    </tbody>                </table>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
