'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Trash2, Sun, Moon, BookOpen, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { useTranslations } from '@/hooks/useTranslations';
import FileListTable from '@/components/FileListTable';
import CompletedFilesTable from '@/components/CompletedFilesTable';
import type { UploadedFile, FileStatus, FileType } from '@/types/file';

interface Job {
  txt_url?: string;
  srt_url?: string;
  vtt_url?: string;
  summary_url?: string;
  speakers_url?: string;
  metadata?: {
    tags?: string[];
    ttsUrl?: string;
    requestedActions?: string[];
    isDocument?: boolean;
  };
  status?: string;
  progress?: number;
  error?: string;
  audio_duration_seconds?: number;
  created_at?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { t, loading: translationsLoading } = useTranslations();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [forcePolling, setForcePolling] = useState(0);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem('uploadedFiles');
      if (savedFiles) {
        const parsedFiles: UploadedFile[] = JSON.parse(savedFiles);
        const restoredFiles = parsedFiles.map(file => {
          if (file.status === 'uploading' || file.status === 'processing') {
            return { ...file, status: 'error' as FileStatus, uploadProgress: 0, processingProgress: 0 };
          }
          if (file.status === 'completed') {
            return file;
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
    try {
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    } catch (error) {
      console.error('Error saving files to localStorage:', error);
    }
  }, [uploadedFiles]);

  const [selectedUploadedFileIds, setSelectedUploadedFileIds] = useState<Set<string>>(new Set());
  const [selectedCompletedFileIds, setSelectedCompletedFileIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('auto');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'pdf' | 'both'>('pdf');
  const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [createSubfolders, setCreateSubfolders] = useState(true);
  const [timerTick, setTimerTick] = useState(0);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);
  const [userStats, setUserStats] = useState<{ 
    total: number;
    completed: number;
    processing: number;
    errors: number;
    totalHours: string;
  } | null>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
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

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          localStorage.clear();
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setLoading(false);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.clear();
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadUserStats();
      const interval = setInterval(loadUserStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadUserStats]);

  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.some(f => f.status === 'processing' && f.processingStartTime);
    if (!hasProcessingFiles) return;
    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [uploadedFiles]);

  useEffect(() => {
    const activeJobs = uploadedFiles.filter(
      f => f.jobId && (f.status === 'pending' || f.status === 'processing' || (f.status === 'error' && f.canRetry === true))
    );
    if (activeJobs.length === 0) return;
    const pollJobs = async () => {
      for (const file of activeJobs) {
        try {
          const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
          if (!res.ok) {
            if (res.status === 404 && file.status !== 'completed') {
              setUploadedFiles(prev => prev.map(f => f.id === file.id && f.status !== 'completed' ? { ...f, status: 'error' } : f));
            }
            continue;
          }
          const job = await res.json();
          if (!job || !job.status) continue;

          setUploadedFiles(prev => prev.map(f => {
            if (f.id !== file.id) return f;
            const now = Date.now();
            let newStatus: FileStatus = 'pending';
            if (job.status === 'completed') {
              newStatus = 'completed';
            } else if (job.status === 'failed' || job.status === 'error') {
              newStatus = 'error';
            } else if (job.status === 'processing') {
              newStatus = 'processing';
            }
            let processingStartTime = f.processingStartTime;
            if (newStatus === 'processing' && !processingStartTime) {
              processingStartTime = now;
            }
            let estimatedTimeRemaining = f.estimatedTimeRemaining;
            if (newStatus === 'processing' && job.progress && processingStartTime) {
              const elapsed = (now - processingStartTime) / 1000;
              const progressRate = job.progress / elapsed;
              if (progressRate > 0 && job.progress < 100) {
                estimatedTimeRemaining = (100 - job.progress) / progressRate;
              }
            }
            return {
              ...f,
              status: newStatus,
              processingProgress: job.progress || f.processingProgress || 0,
              processingStartTime,
              estimatedTimeRemaining,
              error: job.error || f.error,
              txt_url: job.txt_url || f.txt_url,
              srt_url: job.srt_url || f.srt_url,
              vtt_url: job.vtt_url || f.vtt_url,
              summary_url: job.summary_url || f.summary_url,
              speakers_url: job.speakers_url || f.speakers_url,
              actions: f.actions || []
            };
          }));
        } catch (err) {
          console.error('[Polling] Error fetching job:', file.jobId, err);
        }
      }
    };
    pollJobs();
    const interval = setInterval(pollJobs, 5000);
    return () => clearInterval(interval);
  }, [uploadedFiles, forcePolling]);

  const getFileType = (mimeType: string, fileName?: string): FileType => {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'text';
  }

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

    const filesToProcess = Array.from(files).map((file, i) => {
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
      const detectedType = getFileType(file.type, file.name);

      if ((detectedType === 'audio' || detectedType === 'video') && file.size > MAX_FILE_SIZE) {
        showNotification(`El archivo ${file.name} (${formatFileSize(file.size)}) excede el límite de 25MB y no puede ser procesado.`, 'error');
        return null;
      }

      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        uploadProgress: 0,
        status: 'uploading',
        date: new Date().toISOString(),
        fileType: detectedType,
        mimeType: file.type,
        actions: [],
        fileSize: file.size
      };
      return { file, fileId, newFile };
    }).filter(Boolean) as { file: File; fileId: string; newFile: UploadedFile }[];

    if (filesToProcess.length === 0) return;

    setUploadedFiles(prev => [...prev, ...filesToProcess.map(f => f.newFile)]);

    const { upload } = await import('@vercel/blob/client');

    const uploadPromises = filesToProcess.map(async ({ file, fileId }) => {
      try {
        const fileName = (file as any)?.name || 'desconocido';
        if (!(file instanceof File)) {
          throw new Error(`El archivo ${fileName} no es un objeto File válido`);
        }
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const uniqueFilename = `${timestamp}-${randomSuffix}-${file.name}`;
        const blob = await upload(uniqueFilename, file, {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
          clientPayload: JSON.stringify({
            filename: file.name,
            size: file.size,
            type: file.type,
            language: language
          }),
          onUploadProgress: ({ percentage }) => {
            setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: percentage } : f));
          },
        });
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: 100, status: 'pending', blobUrl: blob.url } : f));
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
        showNotification(`Error subiendo ${file.name}: ${err.message}`, 'error');
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
      }
    });
    await Promise.all(uploadPromises);
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    setShowVideoPreview(false);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    processFiles(e.dataTransfer.files);
    setShowVideoPreview(false);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = (fileId: string, type: 'uploaded' | 'completed') => {
    if (type === 'uploaded') {
      setSelectedUploadedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) newSet.delete(fileId);
        else newSet.add(fileId);
        return newSet;
      });
    } else {
      setSelectedCompletedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) newSet.delete(fileId);
        else newSet.add(fileId);
        return newSet;
      });
    }
  };

  const handleSelectAllUploaded = () => {
    const currentUploadedFiles = uploadedFiles;
    if (selectedUploadedFileIds.size === currentUploadedFiles.length) {
      setSelectedUploadedFileIds(new Set());
    } else {
      setSelectedUploadedFileIds(new Set(currentUploadedFiles.map(file => file.id)));
    }
  };

  const handleSelectAllCompleted = () => {
    const currentCompletedFiles = uploadedFiles.filter(f => f.status === 'completed');
    if (selectedCompletedFileIds.size === currentCompletedFiles.length) {
      setSelectedCompletedFileIds(new Set());
    } else {
      setSelectedCompletedFileIds(new Set(currentCompletedFiles.map(file => file.id)));
    }
  };

  const handleApplyAction = (actionName: string) => {
    setUploadedFiles(prevFiles =>
      prevFiles.map(file => {
        if (!selectedUploadedFileIds.has(file.id)) return file;

        const currentActions = file.actions || [];
        const hasAction = currentActions.includes(actionName);

        return {
          ...file,
          actions: hasAction
            ? currentActions.filter(a => a !== actionName)
            : [...currentActions, actionName]
        };
      })
    );
  };

  const handleProcessSelectedFiles = async () => {
    console.log('[Process] Button clicked! Selected files:', selectedUploadedFileIds.size);
    if (selectedUploadedFileIds.size === 0) {
      showNotification('Por favor, selecciona al menos un archivo para procesar.', 'info');
      return;
    }
    const filesToProcess = uploadedFiles.filter(file => selectedUploadedFileIds.has(file.id));
    const filesWithoutActions = filesToProcess.filter(f => !f.actions || f.actions.length === 0);
    if (filesWithoutActions.length > 0) {
      showNotification('Selecciona al menos una acción (Oradores, Resumen, Subtítulos, Etiquetas).', 'error');
      return;
    }
    const filesWithoutUrl = filesToProcess.filter(f => !f.blobUrl);
    if (filesWithoutUrl.length > 0) {
      showNotification('Algunos archivos no se cargaron correctamente. Por favor, recárgalos.', 'error');
      return;
    }
    setError(null);
    console.log('[Process] ✅ All validations passed! Starting processing...');
    let processedCount = 0;
    for (const file of filesToProcess) {
      console.log('[Process] Processing file:', file.name, 'Type:', file.fileType, 'Actions:', file.actions);
      try {
        console.log('[Process] 🚀 Processing file:', file.name, 'blobUrl:', file.blobUrl);
        const isDocument = file.fileType === 'text';
        if (isDocument) {
          console.log('[Process] 📄 Processing as DOCUMENT (server-side with multi-layer fallback)');
          const invalidActions = (file.actions || []).filter(a => a === 'Transcribir' || a === 'Oradores' || a === 'Subtítulos' || a === 'SRT' || a === 'VTT');
          if (invalidActions.length > 0) {
            throw new Error(`Las acciones ${invalidActions.join(', ')} no están disponibles para documentos de texto.`);
          }
          setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing' as const, processingProgress: 5, processingStartTime: Date.now() } : f));
          const processRes = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ blobUrl: file.blobUrl, fileName: file.name, actions: file.actions, summaryType, language })
          });
          if (!processRes.ok) {
            const errorData = await processRes.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Error al procesar documento');
          }
          const responseData = await processRes.json();
          const jobId = responseData.jobId;
          processedCount++;
          setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, jobId, status: 'processing' as const, lastProgressValue: 0, lastProgressTime: Date.now(), stuckWarningShown: false } : f));
          setTimeout(() => setForcePolling(prev => prev + 1), 100);
        } else {
          console.log('[Process] 🎵 Processing as AUDIO/VIDEO with Inngest');
          setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing' as const, processingProgress: 5, processingStartTime: Date.now() } : f));
          const processRes = await fetch(`/api/jobs/${file.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ url: file.blobUrl, filename: file.name, mime: file.mimeType || 'audio/mpeg', size: file.fileSize || 0, language, actions: file.actions, summaryType })
          });
          if (!processRes.ok) {
            const errorData = await processRes.json();
            throw new Error(errorData.message || 'Error al procesar');
          }
          const responseData = await processRes.json();
          const jobId = responseData.data?.jobId || responseData.jobId;
          processedCount++;
          setUploadedFiles(prev => {
            const updated = prev.map(f => f.id === file.id ? { ...f, jobId, status: 'pending' as const, lastProgressValue: 0, lastProgressTime: Date.now(), stuckWarningShown: false } : f);
            return updated;
          });
          setTimeout(() => setForcePolling(prev => prev + 1), 100);
        }
      } catch (err: any) {
        console.error('[Process] ❌ Error:', err);
        setError(`Error procesando ${file.name}: ${err.message}`);
        setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error' } : f));
      }
    }
    if (processedCount > 0) showNotification(`${processedCount} archivo(s) enviado(s) a procesamiento. Ver progreso abajo.`, 'success');
    else showNotification('No se procesó ningún archivo. Verifica las acciones seleccionadas.', 'error');
    setSelectedUploadedFileIds(new Set());
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedUploadedFileIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
    showNotification('Archivo eliminado.', 'info');
  };

  const handleDeleteSelectedCompletedFiles = async () => {
    const selectedCompletedFiles = uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id));
    if (selectedCompletedFiles.length === 0) {
      showNotification('Selecciona al menos un archivo completado para eliminar.', 'info');
      return;
    }
    let dbDeletions = 0;
    for (const file of selectedCompletedFiles) {
      if (file.jobId) {
        try {
          const res = await fetch(`/api/processed-files/${file.jobId}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) dbDeletions++;
        } catch (err: any) {
          console.error(`Error deleting job ${file.jobId}:`, err);
        }
      }
    }
    setUploadedFiles(prev => prev.filter(file => !(file.status === 'completed' && selectedCompletedFileIds.has(file.id))));
    setSelectedCompletedFileIds(new Set());
    showNotification(`${selectedCompletedFiles.length} archivo(s) eliminado(s) correctamente.`, 'success');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('uploadedFiles');
      localStorage.clear();
      router.push('/login');
    }
  };

  const generatePdf = async (title: string, text: string, filename: string) => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      let yPosition = margin;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Archivo: ${filename}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
      yPosition += 10;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
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

  const generateExcel = async (title: string, text: string, filename: string): Promise<Blob> => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = title.substring(0, 31);
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.mergeCells('A1:A1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = title.toUpperCase();
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFE67E22' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      worksheet.getRow(1).height = 30;
      worksheet.addRow(['']);
      worksheet.addRow([`Archivo: ${filename}`]);
      worksheet.addRow([`Fecha: ${new Date().toLocaleDateString('es-ES')}`]);
      worksheet.addRow(['']);
      const headerRow = worksheet.addRow(['Contenido']);
      headerRow.font = { bold: true, size: 12 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE67E22' } };
      headerRow.getCell(1).font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } };
      const lines = text.split('\n');
      lines.forEach(line => worksheet.addRow([line]));
      worksheet.getColumn(1).width = 100;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 5) {
          row.height = 15;
          row.alignment = { wrapText: true, vertical: 'top' };
        }
      });
      const buffer = await workbook.xlsx.writeBuffer();
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      console.error(`Error generando Excel para "${title}":`, error);
      throw error;
    }
  };

  const downloadFilesOrganized = async (file: UploadedFile, job: Job, dirHandle: FileSystemDirectoryHandle, format: 'txt' | 'pdf' | 'both') => {
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const folderHandle = createSubfolders ? await dirHandle.getDirectoryHandle(baseName, { create: true }) : dirHandle;
      const saveBlob = async (handle: any, blob: Blob) => {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      };
      const requestedActions = file.actions || [];
      if (job.txt_url && requestedActions.includes('Transcribir')) {
        const textRes = await fetch(job.txt_url);
        const textContent = await textRes.text();
        const pdfBlob = await generatePdf('Transcripción', textContent, file.name);
        const pdfHandle = await folderHandle.getFileHandle(`${baseName}-transcripcion.pdf`, { create: true });
        await saveBlob(pdfHandle, pdfBlob);
      }
      if (job.summary_url && requestedActions.includes('Resumir')) {
        const summaryRes = await fetch(job.summary_url);
        const summaryText = await summaryRes.text();
        const pdfBlob = await generatePdf('Resumen', summaryText, file.name);
        const pdfHandle = await folderHandle.getFileHandle(`${baseName}-resumen.pdf`, { create: true });
        await saveBlob(pdfHandle, pdfBlob);
      }
      if (job.speakers_url && requestedActions.includes('Oradores')) {
        const speakersRes = await fetch(job.speakers_url);
        const speakersText = await speakersRes.text();
        const pdfBlob = await generatePdf('Análisis de Oradores', speakersText, file.name);
        const pdfHandle = await folderHandle.getFileHandle(`${baseName}-oradores.pdf`, { create: true });
        await saveBlob(pdfHandle, pdfBlob);
      }
      if (job.metadata?.tags && job.metadata.tags.length > 0 && requestedActions.includes('Aplicar Tags')) {
        const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
        const pdfBlob = await generatePdf('Tags', tagsText, file.name);
        const pdfHandle = await folderHandle.getFileHandle(`${baseName}-tags.pdf`, { create: true });
        await saveBlob(pdfHandle, pdfBlob);
      }
      if (job.srt_url && requestedActions.includes('SRT')) {
        const srtRes = await fetch(job.srt_url);
        const srtContent = await srtRes.text();
        const srtBlob = new Blob([srtContent], { type: 'text/plain' });
        const fileHandle = await folderHandle.getFileHandle(`${baseName}.srt.txt`, { create: true });
        await saveBlob(fileHandle, srtBlob);
      }
      if (job.vtt_url && requestedActions.includes('VTT')) {
        const vttRes = await fetch(job.vtt_url);
        const vttContent = await vttRes.text();
        const vttBlob = new Blob([vttContent], { type: 'text/plain' });
        const fileHandle = await folderHandle.getFileHandle(`${baseName}.vtt.txt`, { create: true });
        await saveBlob(fileHandle, vttBlob);
      }
      if (job.metadata?.ttsUrl) {
        const ttsRes = await fetch(job.metadata.ttsUrl);
        const ttsBlob = await ttsRes.blob();
        const fileHandle = await folderHandle.getFileHandle(`${baseName}-audio-narrado.mp3`, { create: true });
        await saveBlob(fileHandle, ttsBlob);
      }
      showNotification(`✅ Archivos para "${file.name}" guardados en la carpeta: ${baseName}`, 'success');
    } catch (error) {
      console.error('Error downloading organized files:', error);
      showNotification(`Error al descargar los archivos para "${file.name}". Inténtalo de nuevo.`, 'error');
    }
  };

  const downloadFilesIndividually = async (file: UploadedFile, job: Job, format: 'txt' | 'pdf' | 'both') => {
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
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const requestedActions = file.actions || [];
    if (job.txt_url && requestedActions.includes('Transcribir')) {
      const res = await fetch(job.txt_url);
      const text = await res.text();
      const pdfBlob = await generatePdf('Transcripción', text, file.name);
      triggerDownload(pdfBlob, `${baseName}-transcripcion.pdf`);
    }
    if (job.summary_url && requestedActions.includes('Resumir')) {
      const res = await fetch(job.summary_url);
      const text = await res.text();
      const pdfBlob = await generatePdf('Resumen', text, file.name);
      triggerDownload(pdfBlob, `${baseName}-resumen.pdf`);
    }
    if (job.speakers_url && requestedActions.includes('Oradores')) {
      const res = await fetch(job.speakers_url);
      const text = await res.text();
      const pdfBlob = await generatePdf('Análisis de Oradores', text, file.name);
      triggerDownload(pdfBlob, `${baseName}-oradores.pdf`);
    }
    if (job.metadata?.tags && job.metadata.tags.length > 0 && requestedActions.includes('Aplicar Tags')) {
      const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
      const pdfBlob = await generatePdf('Tags', tagsText, file.name);
      triggerDownload(pdfBlob, `${baseName}-tags.pdf`);
    }
    if (job.srt_url && requestedActions.includes('SRT')) {
      const res = await fetch(job.srt_url);
      const text = await res.text();
      const srtBlob = new Blob([text], { type: 'text/plain' });
      triggerDownload(srtBlob, `${baseName}.srt.txt`);
    }
    if (job.vtt_url && requestedActions.includes('VTT')) {
      const res = await fetch(job.vtt_url);
      const text = await res.text();
      const vttBlob = new Blob([text], { type: 'text/plain' });
      triggerDownload(vttBlob, `${baseName}.vtt.txt`);
    }
    if (job.metadata?.ttsUrl) window.open(job.metadata.ttsUrl, '_blank');
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return t('dashboard.status.uploading');
      case 'pending': return t('dashboard.status.pending');
      case 'processing': return t('dashboard.status.processing');
      case 'completed': return t('dashboard.status.completed');
      case 'error': return t('dashboard.status.error');
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return darkMode ? 'text-blue-400' : 'text-blue-600';
      case 'pending': return darkMode ? 'text-amber-400' : 'text-amber-600';
      case 'processing': return darkMode ? 'text-purple-400' : 'text-purple-600';
      case 'completed': return darkMode ? 'text-green-400' : 'text-green-600';
      case 'error': return darkMode ? 'text-red-400' : 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const selectedFiles = uploadedFiles.filter(file => selectedUploadedFileIds.has(file.id));
  const canTranscribe = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');
  const hasDocuments = selectedFiles.some(file => file.fileType === 'text');
  const hasAudioVideo = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${ 
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          } max-w-md`}>
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="fixed top-6 right-6 z-40 flex items-center gap-2">
        <button onClick={() => router.push('/guia')} className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`} title="Guía de usuario">
          <BookOpen className={`h-4 w-4 ${textSecondary}`} />
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`} title="Cambiar tema">
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <button onClick={() => router.push('/pricing')} className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`} title="Ver planes y precios">
          <span className="text-lg">💳</span>
        </button>
        <button onClick={() => router.push('/settings')} className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`} title="Ajustes">
          <span className="text-lg">⚙️</span>
        </button>
        <button onClick={handleLogout} className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`} title="Cerrar sesión">
          <LogOut className={`h-4 w-4 ${textSecondary}`} />
        </button>
      </div>

      <div className="flex pt-10" style={{ height: '100vh' }}>
        <div className={`${bgSecondary} ${border} border-r p-6 flex flex-col`} style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
          
          <div className="flex flex-col mb-6">
            <div className="flex items-baseline gap-x-3">
              <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
              <span className={textSecondary}>{t('dashboard.workingFor')}</span>
            </div>
            {(user?.name || user?.email) && (
              <p className={`text-white text-xl font-medium -mt-1 ml-1`}>{user.name || user.email}</p>
            )}
          </div>

          <div className="mb-6">
            <div
              className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <p className={`text-xs ${textSecondary} mb-3`}>{t('dashboard.uploadFiles')}</p>
              <div className={`${textSecondary} mb-3`}>
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('dashboard.dragDrop')}</p>
              <p className={`text-xs ${textSecondary} mb-2`}>{t('dashboard.or')}</p>
              <label>
                <span className="text-orange-500 text-xs font-medium hover:text-orange-600 cursor-pointer">{t('dashboard.selectFiles')}</span>
                <input type="file" multiple className="hidden" accept="audio/*,video/*,.txt,.docx,.pdf" onChange={handleFileChange} />
              </label>
            </div>
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-500 text-sm">🤖</span>
              <h2 className={`text-sm font-medium ${textPrimary}`}>{t('dashboard.aiActions')}</h2>
            </div>
            <p className={`text-xs ${textSecondary} mb-3`}>{t('dashboard.selectFilesAndActions')}</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => !hasDocuments && handleApplyAction('Transcribir')} className={`p-2 ${canTranscribe && !hasDocuments ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs font-medium transition-colors`} disabled={!canTranscribe || hasDocuments} title={hasDocuments ? t('dashboard.notAvailableForDocs') : t('dashboard.transcribe')}>
                  📝 {t('dashboard.transcribe')}
                </button>
                <button onClick={() => !hasDocuments && handleApplyAction('Oradores')} className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium transition-colors`} disabled={hasDocuments} title={hasDocuments ? t('dashboard.notAvailableForDocs') : t('dashboard.speakers')}>
                  🎙️ {t('dashboard.speakers')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleApplyAction('Resumir')} className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors" title={t('dashboard.summary')}>
                  📋 {t('dashboard.summary')}
                </button>
                <div className="flex items-center justify-around gap-1 text-xs">
                  <label className="flex items-center gap-1">
                    <input type="radio" className="accent-orange-500 scale-75" name="summary" checked={summaryType === 'short'} onChange={() => setSummaryType('short')} />
                    <span className={textSecondary}>{t('dashboard.short')}</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" className="accent-orange-500 scale-75" name="summary" checked={summaryType === 'detailed'} onChange={() => setSummaryType('detailed')} />
                    <span className={textSecondary}>{t('dashboard.detailed')}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => !hasDocuments && handleApplyAction('Subtítulos')} className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium transition-colors`} disabled={hasDocuments} title={hasDocuments ? t('dashboard.notAvailableForDocs') : t('dashboard.subtitles')}>
                  📄 {t('dashboard.subtitles')}
                </button>
                <div className="flex items-center justify-around gap-1 text-xs">
                  <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500" onChange={(e) => { if (e.target.checked && !hasDocuments) handleApplyAction('SRT'); }} disabled={hasDocuments} title={hasDocuments ? 'No disponible para documentos' : 'Formato SRT'} />
                    <span className={textSecondary}>SRT</span>
                  </label>
                  <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500" onChange={(e) => { if (e.target.checked && !hasDocuments) handleApplyAction('VTT'); }} disabled={hasDocuments} title={hasDocuments ? 'No disponible para documentos' : 'Formato VTT'} />
                    <span className={textSecondary}>VTT</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleApplyAction('Aplicar Tags')} className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors" title={t('dashboard.tags')}>
                  🏷️ {t('dashboard.tags')}
                </button>
                <Link href="/processed-files" className="flex items-center justify-center p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors" title={t('dashboard.processedFiles')}>
                  ✅ {t('dashboard.processedFiles')}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => hasDocuments && handleApplyAction('GenerarAudio')} className={`p-2 ${hasDocuments ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs font-medium transition-colors`} disabled={!hasDocuments} title={hasDocuments ? t('dashboard.generateAudio') : t('dashboard.onlyForDocs')}>
                  🎤 {t('dashboard.generateAudio')}
                </button>
                <div className="flex items-center justify-center text-xs">
                  <span className={`${textSecondary} text-[10px]`}>{hasDocuments ? `🔊 ${t('dashboard.naturalVoice')}` : t('dashboard.onlyForDocs')}</span>
                </div>
              </div>
              <button onClick={handleProcessSelectedFiles} className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors mt-3 shadow-lg">
                🚀 {t('dashboard.processSelectedFiles')}
              </button>
            </div>
            <p className={`text-xs ${textSecondary} text-center mt-2`}>💡 {t('dashboard.tipSelectFiles')}</p>
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-800">
            <p className={`text-xs ${textSecondary} text-center mb-1`}>© 2025 Annalogica by videoconversion digital lab, S.L.</p>
            <div className="flex justify-center gap-3 text-xs mb-2">
              <a href="/privacy" className={`${textSecondary} hover:text-orange-500`}>{t('nav.privacy')}</a>
              <a href="/terms" className={`${textSecondary} hover:text-orange-500`}>{t('nav.terms')}</a>
              <a href="/settings#contacto" className={`${textSecondary} hover:text-orange-500`}>{t('nav.contact')}</a>
            </div>
            <div className={`text-xs ${textSecondary} text-center space-y-1`}>
              <p>{t('dashboard.emails')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
          <div className="mb-6 flex justify-start">
            <label htmlFor="language-select" className="sr-only">{t('dashboard.contentLanguage')}</label>
            <select
                id="language-select"
                className={`p-2 ${bgSecondary} rounded-lg shadow-sm ${border} border ${textPrimary} text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ minWidth: '180px' }}
                title={t('dashboard.contentLanguage')}
            >
                <option value="auto">{t('dashboard.autoDetect')}</option>
                <option value="es">Español</option>
                <option value="ca">Català</option>
                <option value="eu">Euskera</option>
                <option value="gl">Gallego</option>
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
            </select>
        </div>

          <FileListTable
            files={uploadedFiles}
            selectedFileIds={selectedUploadedFileIds}
            darkMode={darkMode}
            onSelectFile={(fileId) => handleFileSelect(fileId, 'uploaded')}
            onSelectAll={handleSelectAllUploaded}
            onDeselectAll={() => setSelectedUploadedFileIds(new Set())}
            onRemoveFile={handleRemoveFile}
          />
        </div>
      </div>
    </div>
  );
}
