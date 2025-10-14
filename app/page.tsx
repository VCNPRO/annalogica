'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Trash2, Sun, Moon, HelpCircle, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';

// Type definitions
type FileStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  uploadProgress: number;
  processingProgress?: number;
  status: FileStatus;
  date: string;
  fileType: 'audio' | 'video' | 'text';
  actions: string[];
  jobId?: string;
  blobUrl?: string;
  audioDuration?: number;
  fileSize?: number;
  processingStartTime?: number;
  estimatedTimeRemaining?: number;
}

interface Job {
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

export default function Dashboard() {
  const router = useRouter();

  // Component State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'pdf' | 'both'>('pdf');
  const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [timerTick, setTimerTick] = useState(0); // Force re-render for timer updates

  // Effects
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem('uploadedFiles');
      if (savedFiles) {
        const parsedFiles: UploadedFile[] = JSON.parse(savedFiles);
        const restoredFiles = parsedFiles.map(file => {
          if (file.status === 'uploading' || file.status === 'processing') {
            return { ...file, status: 'error' as FileStatus, uploadProgress: 0, processingProgress: 0 };
          }
          return file;
        });
        setUploadedFiles(restoredFiles);
      }
    } catch (error) {
      console.error('Error loading files from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setLoading(false);
      } catch (error) {
        console.error('Error verifying auth:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.some(f => f.status === 'processing' && f.processingStartTime);
    if (!hasProcessingFiles) return;
    const interval = setInterval(() => setTimerTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [uploadedFiles]);

  useEffect(() => {
    const activeJobs = uploadedFiles.filter(f => f.jobId && (f.status === 'pending' || f.status === 'processing'));
    if (activeJobs.length === 0) return;

    const pollJobs = async () => {
      for (const file of activeJobs) {
        try {
          const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
          if (!res.ok) continue;
          const data = await res.json();
          const job = data.job;

          let newStatus: FileStatus = file.status;
          let processingProgress = file.processingProgress || 0;
          let processingStartTime = file.processingStartTime;
          let estimatedTimeRemaining = file.estimatedTimeRemaining;

          if (job.status === 'processing' || job.status === 'transcribed') {
            newStatus = 'processing';
            if (!processingStartTime) processingStartTime = Date.now();
            const audioDuration = job.audio_duration_seconds || 60;
            const estimatedTotalTime = audioDuration * 0.25;
            const elapsed = (Date.now() - new Date(job.created_at).getTime()) / 1000;

            if (job.status === 'transcribed') {
              processingProgress = 98;
              estimatedTimeRemaining = 5;
            } else {
              const baseProgress = Math.floor((elapsed / estimatedTotalTime) * 100);
              processingProgress = Math.min(90, baseProgress);
              estimatedTimeRemaining = Math.ceil(((100 - processingProgress) / 100) * estimatedTotalTime);
            }
          } else if (job.status === 'completed' || job.status === 'summarized') {
            newStatus = 'completed';
            processingProgress = 100;
            estimatedTimeRemaining = 0;
          } else if (job.status === 'failed' || job.status === 'error') {
            newStatus = 'error';
          }

          if (newStatus !== file.status || processingProgress !== file.processingProgress) {
            setUploadedFiles(prev => prev.map(f =>
              f.id === file.id ? { ...f, status: newStatus, processingProgress, audioDuration: job.audio_duration_seconds, processingStartTime, estimatedTimeRemaining } : f
            ));
          }
        } catch (err) {
          console.error('[Polling] Error fetching job:', file.jobId, err);
        }
      }
    };

    pollJobs();
    const interval = setInterval(pollJobs, 5000);
    return () => clearInterval(interval);
  }, [uploadedFiles]);

  // Helper Functions
  const getFileType = (mimeType: string): 'audio' | 'video' | 'text' => {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'text';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const formatElapsedTime = (startTime?: number): string => {
    if (!startTime) return '0:00';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // File Handling
  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const filesToUpload = Array.from(files).map((file, i) => {
      const fileId = `${Date.now()}-${i}`;
      return {
        file,
        fileId,
        newFile: {
          id: fileId,
          name: file.name,
          uploadProgress: 0,
          status: 'uploading',
          date: new Date().toISOString(),
          fileType: getFileType(file.type),
          actions: [],
          fileSize: file.size,
        } as UploadedFile,
      };
    });

    setUploadedFiles(prev => [...prev, ...filesToUpload.map(f => f.newFile)]);

    const { upload } = await import('@vercel/blob/client');
    await Promise.all(filesToUpload.map(async ({ file, fileId }) => {
      try {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
          onUploadProgress: ({ percentage }) => {
            setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: percentage } : f));
          },
        });
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: 100, status: 'pending', blobUrl: blob.url } : f));
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
      }
    }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = (fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) newSet.delete(fileId); else newSet.add(fileId);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === uploadedFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(uploadedFiles.map(file => file.id)));
    }
  };

  const handleApplyAction = (actionName: string) => {
    setUploadedFiles(prevFiles =>
      prevFiles.map(file =>
        selectedFileIds.has(file.id)
          ? { ...file, actions: file.actions.includes(actionName) ? file.actions.filter(a => a !== actionName) : [...file.actions, actionName] }
          : file
      )
    );
  };

  const handleProcessSelectedFiles = async () => {
    const filesToProcess = uploadedFiles.filter(file => selectedFileIds.has(file.id));
    if (filesToProcess.length === 0) return alert('Por favor, selecciona al menos un archivo para procesar.');
    if (filesToProcess.some(f => f.actions.length === 0)) return alert('Algunos archivos no tienen acciones seleccionadas.');

    for (const file of filesToProcess) {
      if (file.actions.includes('Transcribir') && file.blobUrl) {
        try {
          const res = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ audioUrl: file.blobUrl, filename: file.name, language: language })
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Error al procesar');
          const { jobId } = await res.json();
          setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, jobId, status: 'pending' } : f));
        } catch (err: any) {
          setError(`Error procesando ${file.name}: ${err.message}`);
          setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error' } : f));
        }
      }
    }
    setSelectedFileIds(new Set());
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  const generatePdf = async (title: string, text: string, filename: string) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const margin = 20;
    const usableWidth = doc.internal.pageSize.getWidth() - (margin * 2);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title.toUpperCase(), doc.internal.pageSize.getWidth() / 2, margin, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Archivo: ${filename}`, margin, margin + 10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, margin + 15);
    doc.line(margin, margin + 20, doc.internal.pageSize.getWidth() - margin, margin + 20);
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(text, usableWidth);
    let yPosition = margin + 30;
    for (let i = 0; i < splitText.length; i++) {
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(splitText[i], margin, yPosition);
      yPosition += 5;
    }
    return doc.output('blob');
  };

  const downloadFile = async (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFilesIndividually = async (file: UploadedFile, job: Job, format: 'txt' | 'pdf' | 'both') => {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (job.txt_url) {
      const text = await fetch(job.txt_url).then(res => res.text());
      if (format === 'pdf' || format === 'both') await generatePdf('Transcripción', text, file.name).then(blob => downloadFile(blob, `${baseName}-transcripcion.pdf`));
      if (format === 'txt' || format === 'both') downloadFile(new Blob([text], { type: 'text/plain' }), `${baseName}-transcripcion.txt`);
    }
    // ... similar for summary, speakers, etc.
  };

  // Render Logic
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div></div>;
  }

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      {/* Header and other UI elements */}
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Pre-producción Beta-tester - Usuario: {user?.name || user?.email || 'Usuario'}
      </div>

      {/* Main Content */}
      <div className="flex pt-10" style={{ height: '100vh' }}>
        {/* Sidebar */}
        <div className={`${bgSecondary} ${border} border-r p-6 flex flex-col`} style={{ width: '33.333%' }}>
          {/* Carga de Archivos */}
          <div className="mb-6">
            <div className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer`}>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
              <label>Arrastra o selecciona archivos</label>
            </div>
          </div>

          {/* Acciones IA */}
          <div className="mb-6">
            <h2 className={`text-sm font-medium ${textPrimary}`}>Acciones IA</h2>
            <div className="space-y-3 mt-3">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`w-full p-2 border ${border} ${bgSecondary} ${textPrimary} rounded-md text-xs`}>
                <option value="auto">Detección automática</option>
                <option value="es">Español</option>
                <option value="ca">Català</option>
                <option value="eu">Euskera</option>
                <option value="gl">Gallego</option>
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
              <button onClick={() => handleApplyAction('Transcribir')} className="p-2 bg-orange-500 text-white rounded-lg text-xs w-full">📝 Transcribir</button>
              <button onClick={handleProcessSelectedFiles} className="p-2 bg-green-500 text-white rounded-lg text-xs w-full">🚀 Procesar Archivos</button>
            </div>
          </div>
        </div>

        {/* File Lists */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Archivos Cargados */}
          <div className={`${bgSecondary} rounded-lg ${border} border mb-6`}>
            <h2 className={`text-sm font-medium ${textPrimary} p-4`}>Archivos Cargados</h2>
            <div className="overflow-y-auto">
              {uploadedFiles.map(file => (
                <div key={file.id} className={`px-4 py-3 ${border} border-b`}>
                  <p>{file.name}</p>
                  <p className={textSecondary}>{getStatusText(file.status)} - {file.uploadProgress}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Archivos Completados */}
          <div className={`${bgSecondary} rounded-lg ${border} border`}>
            <h2 className={`text-sm font-medium ${textPrimary} p-4`}>Archivos Completados</h2>
            {/* ... render completed files ... */}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusText(status: FileStatus) {
  const map = {
    uploading: 'Subiendo',
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    error: 'Error',
  };
  return map[status];
}
