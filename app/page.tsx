'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Trash2, Sun, Moon, BookOpen, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';

// AssemblyAI + Inngest - Arquitectura asíncrona con polling

type FileStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  uploadProgress: number;
  processingProgress?: number; // Add processing progress
  status: FileStatus;
  date: string;
  fileType: 'audio' | 'video' | 'text'; // New: Store file type
  actions: string[]; // New: Store selected actions for the file
  jobId?: string; // Add jobId to link to details page
  blobUrl?: string; // Store blob URL for processing
  audioDuration?: number; // Store audio duration for progress calculation
  fileSize?: number; // Store original file size in bytes
  processingStartTime?: number; // Store when processing started (timestamp)
  estimatedTimeRemaining?: number; // Estimated seconds remaining
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Keep this state

  // Load files from localStorage on initial render
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem('uploadedFiles');
      if (savedFiles) {
        const parsedFiles: UploadedFile[] = JSON.parse(savedFiles);
        // Reset progress for files that were uploading or processing
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

  // Save files to localStorage whenever they change
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
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'pdf' | 'both'>('pdf');
  const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [createSubfolders, setCreateSubfolders] = useState(true);
  const [timerTick, setTimerTick] = useState(0); // Force re-render for timer updates
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);

  // Show notification function
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000); // Auto-hide after 4 seconds
  };

  useEffect(() => {
    // SECURITY: Verificar autenticación mediante cookie httpOnly
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include' // Importante: incluir cookies
        });

        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        setUser(data.user);
        // Guardar datos del usuario en localStorage (no sensible)
        localStorage.setItem('user', JSON.stringify(data.user));
        setLoading(false);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Update timer every second for files being processed
  useEffect(() => {
    const hasProcessingFiles = uploadedFiles.some(f => f.status === 'processing' && f.processingStartTime);
    if (!hasProcessingFiles) return;

    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  // Polling para actualizar estado de jobs activos
  useEffect(() => {
    // Filtrar archivos que necesitan polling (tienen jobId y están pending o processing)
    const activeJobs = uploadedFiles.filter(
      f => f.jobId && (f.status === 'pending' || f.status === 'processing')
    );

    if (activeJobs.length === 0) return;

    const pollJobs = async () => {
      for (const file of activeJobs) {
        try {
          // SECURITY: Cookie httpOnly se envía automáticamente
          const res = await fetch(`/api/jobs/${file.jobId}`, {
            credentials: 'include'
          });

          if (!res.ok) continue;

          const data = await res.json();
          const job = data.job;

          // Auto-restart logic: Check if job is stuck (no progress for too long)
          if (file.processingStartTime) {
            const timeSinceStart = (Date.now() - file.processingStartTime) / 1000; // seconds
            const audioDuration = job.audio_duration_seconds || 60;
            const maxExpectedTime = audioDuration * 0.5; // 0.5x multiplier (very generous timeout)
            const timeoutThreshold = Math.max(maxExpectedTime, 1200); // At least 20 minutes

            // If job is stuck for too long (beyond reasonable processing time)
            if (timeSinceStart > timeoutThreshold && (job.status === 'processing' || job.status === 'pending')) {
              console.warn(`[Auto-restart] Job ${file.jobId} appears stuck (${Math.floor(timeSinceStart)}s elapsed, expected ~${Math.floor(maxExpectedTime)}s)`);

              // TODO: Implement retry/restart API endpoint
              // For now, just log it
              setError(`Archivo "${file.name}" parece estar bloqueado. Por favor, intenta procesarlo de nuevo.`);
            }
          }

          // Map job status to FileStatus
          let newStatus: FileStatus = file.status;
          let processingProgress = file.processingProgress || 0;
          let processingStartTime = file.processingStartTime;
          let estimatedTimeRemaining = file.estimatedTimeRemaining;

          // Check if this is a document (PDF, DOCX, TXT)
          const isDocument = file.fileType === 'text' || job.metadata?.isDocument;

          if (job.status === 'processing' || job.status === 'transcribed') {
            newStatus = 'processing';

            // Set processing start time if not already set
            if (!processingStartTime) {
              processingStartTime = Date.now();
            }

            const createdAt = new Date(job.created_at).getTime();
            const now = Date.now();
            const elapsed = (now - createdAt) / 1000; // seconds

            if (isDocument) {
              // Document processing: Simpler progress model
              // Documents typically process faster than audio
              const estimatedDocTime = 30; // ~30 seconds for document processing

              if (job.status === 'transcribed') {
                // Document text extracted, generating summary/tags
                processingProgress = 95;
                estimatedTimeRemaining = 5;
              } else {
                // Extract + parse phase
                const baseProgress = Math.floor((elapsed / estimatedDocTime) * 100);
                processingProgress = Math.min(90, baseProgress);
                const remainingProgress = 100 - processingProgress;
                estimatedTimeRemaining = Math.ceil((remainingProgress / 100) * estimatedDocTime);
              }
            } else {
              // Audio/Video processing: Use audio duration
              const audioDuration = job.audio_duration_seconds || 60;
              const estimatedTotalTime = audioDuration * 0.25;

              if (job.status === 'transcribed') {
                processingProgress = 98;
                estimatedTimeRemaining = 5;
              } else {
                const baseProgress = Math.floor((elapsed / estimatedTotalTime) * 100);
                processingProgress = Math.min(98, baseProgress);
                const remainingProgress = 100 - processingProgress;
                estimatedTimeRemaining = Math.ceil((remainingProgress / 100) * estimatedTotalTime);
              }
            }
          } else if (job.status === 'completed' || job.status === 'summarized') {
            newStatus = 'completed';
            processingProgress = 100;
            estimatedTimeRemaining = 0;
          } else if (job.status === 'failed' || job.status === 'error') {
            newStatus = 'error';
          }

          // Update file status and progress if changed
          if (newStatus !== file.status || processingProgress !== file.processingProgress || estimatedTimeRemaining !== file.estimatedTimeRemaining) {
            setUploadedFiles(prev => prev.map(f =>
              f.id === file.id ? {
                ...f,
                status: newStatus,
                processingProgress,
                audioDuration: job.audio_duration_seconds,
                processingStartTime,
                estimatedTimeRemaining
              } : f
            ));
          }
        } catch (err) {
          console.error('[Polling] Error fetching job:', file.jobId, err);
        }
      }
    };

    // Poll immediately and then every 5 seconds
    pollJobs();
    const interval = setInterval(pollJobs, 5000);

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  const getFileType = (mimeType: string, filename: string): 'audio' | 'video' | 'text' => {
    // Check MIME type first
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('text/') || mimeType === 'application/pdf' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'text';

    // Fallback: check file extension (some browsers don't report MIME type correctly for PDFs)
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf' || ext === 'txt' || ext === 'docx') return 'text';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext || '')) return 'audio';
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')) return 'video';

    return 'text'; // Default to text if unknown
  };

  // Helper function to format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  // Helper function to format elapsed time
  const formatElapsedTime = (startTime?: number): string => {
    if (!startTime) return '0:00';
    const elapsed = Math.floor((Date.now() - startTime) / 1000); // seconds
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper function to format time remaining
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    try {
      // SECURITY: No necesitamos token, la cookie httpOnly se envía automáticamente

      // PERFORMANCE: Validación de tamaño de archivos
      // Límite de Deepgram para audio/video: 2 GB
      // Límite de procesamiento para documentos: 100 MB
      const MAX_AUDIO_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB (límite Deepgram)
      const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100 MB (límite razonable para PDFs/DOCX)

      const filesToProcess = Array.from(files).map((file, i) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
        const detectedType = getFileType(file.type, file.name);
        console.log(`[Upload] File: ${file.name}, MIME: ${file.type}, Detected type: ${detectedType}`);

        // Validar tamaño según tipo de archivo
        if (detectedType === 'audio' || detectedType === 'video') {
          if (file.size > MAX_AUDIO_VIDEO_SIZE) {
            showNotification(
              `El archivo de ${detectedType} "${file.name}" (${formatFileSize(file.size)}) excede el límite de 2 GB.\n\n` +
              `Por favor, comprima o divida el archivo antes de cargarlo.`,
              'error'
            );
            return null;
          }
        } else if (detectedType === 'text') {
          if (file.size > MAX_DOCUMENT_SIZE) {
            showNotification(
              `El documento "${file.name}" (${formatFileSize(file.size)}) excede el límite de 100 MB.\n\n` +
              `Por favor, reduzca el tamaño del archivo antes de cargarlo.`,
              'error'
            );
            return null;
          }
        }

        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          uploadProgress: 0,
          status: 'uploading',
          date: new Date().toISOString(),
          fileType: detectedType,
          actions: [],
          fileSize: file.size // Capture file size in bytes
        };
        return { file, fileId, newFile };
      }).filter(Boolean) as { file: File; fileId: string; newFile: UploadedFile }[]; // Filter out nulls and cast
      
      if (filesToProcess.length === 0) {
        return; // No files to process after filtering
      }

      // Add all files to state at once
      setUploadedFiles(prev => [...prev, ...filesToProcess.map(f => f.newFile)]);

      // Upload all files in parallel
      const { upload } = await import('@vercel/blob/client');

      const uploadPromises = filesToProcess.map(async ({ file, fileId }) => {
        try {
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
              setUploadedFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, uploadProgress: percentage } : f
              ));
            },
          });

          // Update with blobUrl
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, uploadProgress: 100, status: 'pending', blobUrl: blob.url } : f
          ));
        } catch (err: any) {
          console.error(`Error uploading ${file.name}:`, err);
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error' } : f
          ));
        }
      });

      await Promise.all(uploadPromises);
      
    } catch (err: any) {
      setError(err.message);
      setUploadedFiles(prev => prev.map(f => 
        f.id === (files && files[0] ? files[0].name : '') ? { ...f, status: 'error' } : f // This needs to be fixed for multiple files
      ));
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = ''; // Clear input to allow re-uploading same file
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

  const handleFileSelect = (fileId: string, type: 'uploaded' | 'completed') => {
    if (type === 'uploaded') {
      setSelectedUploadedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
        return newSet;
      });
    } else { // type === 'completed'
      setSelectedCompletedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
        return newSet;
      });
    }
  };

  const handleSelectAllUploaded = () => {
    const currentUploadedFiles = uploadedFiles.filter(f => f.status !== 'completed');
    if (selectedUploadedFileIds.size === currentUploadedFiles.length) {
      setSelectedUploadedFileIds(new Set()); // Deselect all uploaded
    } else {
      setSelectedUploadedFileIds(new Set(currentUploadedFiles.map(file => file.id))); // Select all uploaded
    }
  };

  const handleSelectAllCompleted = () => {
    const currentCompletedFiles = uploadedFiles.filter(f => f.status === 'completed');
    if (selectedCompletedFileIds.size === currentCompletedFiles.length) {
      setSelectedCompletedFileIds(new Set()); // Deselect all completed
    } else {
      setSelectedCompletedFileIds(new Set(currentCompletedFiles.map(file => file.id))); // Select all completed
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
    console.log('[Process] Uploaded files:', uploadedFiles.map(f => ({ id: f.id, name: f.name, actions: f.actions, blobUrl: f.blobUrl, fileType: f.fileType })));

    if (selectedUploadedFileIds.size === 0) {
      showNotification('Por favor, selecciona al menos un archivo para procesar.', 'info');
      return;
    }

    const filesToProcess = uploadedFiles.filter(file => selectedUploadedFileIds.has(file.id));
    console.log('[Process] Files to process (after filter):', filesToProcess.map(f => ({ name: f.name, actions: f.actions, fileType: f.fileType })));

    // Verificar que tengan acciones seleccionadas
    const filesWithoutActions = filesToProcess.filter(f => f.actions.length === 0);
    if (filesWithoutActions.length > 0) {
      console.log('[Process] Files without actions:', filesWithoutActions.map(f => f.name));
      showNotification('Selecciona al menos una acción (Oradores, Resumen, Subtítulos, Etiquetas).', 'error');
      return;
    }

    // Verificar que tengan blobUrl
    const filesWithoutUrl = filesToProcess.filter(f => !f.blobUrl);
    if (filesWithoutUrl.length > 0) {
      console.log('[Process] Files without blobUrl:', filesWithoutUrl.map(f => f.name));
      showNotification('Algunos archivos no se cargaron correctamente. Por favor, recárgalos.', 'error');
      return;
    }

    setError(null);

    console.log('[Process] ✅ All validations passed! Starting processing...');
    console.log('[Process] Files to process:', filesToProcess.map(f => ({ name: f.name, actions: f.actions, fileType: f.fileType, blobUrl: f.blobUrl })));

    let processedCount = 0;

    // Procesar archivos según su tipo
    for (const file of filesToProcess) {
      console.log('[Process] Processing file:', file.name, 'Type:', file.fileType, 'Actions:', file.actions);

      try {
        console.log('[Process] 🚀 Processing file:', file.name, 'blobUrl:', file.blobUrl);

        // Determinar si es documento o audio/video
        const isDocument = file.fileType === 'text';
        console.log('[Process] Is document?', isDocument, 'fileType:', file.fileType);

        if (isDocument) {
          // Procesar como documento (PDF, TXT, DOCX) - SERVER-SIDE PROCESSING
          console.log('[Process] 📄 Processing as DOCUMENT (server-side with multi-layer fallback)');

          // Validar que las acciones sean apropiadas para documentos
          const invalidActions = file.actions.filter(a =>
            a === 'Transcribir' || a === 'Oradores' || a === 'Subtítulos' || a === 'SRT' || a === 'VTT'
          );

          if (invalidActions.length > 0) {
            throw new Error(`Las acciones ${invalidActions.join(', ')} no están disponibles para documentos de texto. Solo puedes usar Resumen y Etiquetas.`);
          }

          // Send document URL to server for processing (same as audio/video)
          // Server will download, parse with multi-layer fallback, and process
          const processRes = await fetch('/api/process-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              blobUrl: file.blobUrl,
              fileName: file.name,
              actions: file.actions,
              summaryType: summaryType,
              language: language
            })
          });

          console.log('[Process] Document API Response status:', processRes.status);

          if (!processRes.ok) {
            const errorData = await processRes.json();
            console.error('[Process] Document API Error:', errorData);
            throw new Error(errorData.error || 'Error al procesar documento');
          }

          const responseData = await processRes.json();
          console.log('[Process] Document API Response data:', responseData);

          const jobId = responseData.jobId;
          console.log('[Process] ✅ Document job created:', jobId, file.name);
          processedCount++;

          // Update file with jobId
          setUploadedFiles(prev => prev.map(f => {
            if (f.id === file.id) {
              console.log('[Process] MATCH! Updating file:', f.id, 'with jobId:', jobId);
              return { ...f, jobId, status: 'processing' as const };
            }
            return f;
          }));

        } else {
          // Procesar como audio/video (la transcripción se hace siempre internamente)
          console.log('[Process] 🎵 Processing as AUDIO/VIDEO');

          // SECURITY: Cookie httpOnly se envía automáticamente
          const processRes = await fetch('/api/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              audioUrl: file.blobUrl,
              filename: file.name,
              language: language,
              actions: file.actions,
              summaryType: summaryType
            })
          });

          console.log('[Process] API Response status:', processRes.status);

          if (!processRes.ok) {
            const errorData = await processRes.json();
            console.error('[Process] API Error:', errorData);
            throw new Error(errorData.error || 'Error al procesar');
          }

          const responseData = await processRes.json();
          console.log('[Process] API Response data:', responseData);

          // API wraps response in { success, data: { jobId, status, message } }
          const jobId = responseData.data?.jobId || responseData.jobId;
          console.log('[Process] ✅ Job created:', jobId, file.name);
          processedCount++;

          // Update file with jobId
          setUploadedFiles(prev => prev.map(f => {
            if (f.id === file.id) {
              console.log('[Process] MATCH! Updating file:', f.id, 'with jobId:', jobId);
              return { ...f, jobId, status: 'pending' as const };
            }
            return f;
          }));
        }

      } catch (err: any) {
        console.error('[Process] ❌ Error:', err);
        setError(`Error procesando ${file.name}: ${err.message}`);
        setUploadedFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error' } : f
        ));
      }
    }

    console.log('[Process] 🏁 Finished! Processed', processedCount, 'files');

    if (processedCount > 0) {
      showNotification(`${processedCount} archivo(s) enviado(s) a procesamiento. Ver progreso abajo.`, 'success');
    } else {
      showNotification('No se procesó ningún archivo. Verifica las acciones seleccionadas.', 'error');
    }

    // Deselect all after processing
    setSelectedUploadedFileIds(new Set());
  };



  const handleDeleteSelectedCompletedFiles = async () => {
    const selectedCompletedFiles = uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id));

    if (selectedCompletedFiles.length === 0) {
      showNotification('Selecciona al menos un archivo completado para eliminar.', 'info');
      return;
    }

    // Delete completed files from database (only if they have jobId)
    let dbDeletions = 0;
    for (const file of selectedCompletedFiles) {
      if (file.jobId) {
        try {
          const res = await fetch(`/api/processed-files/${file.jobId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (res.ok) {
            dbDeletions++;
          }
          // Si falla, no mostramos error - solo lo eliminamos del localStorage
        } catch (err: any) {
          console.error(`Error deleting job ${file.jobId}:`, err);
          // No mostramos notificación de error, seguimos eliminando
        }
      }
    }

    // Remove ALL selected files from state (this will also update localStorage via useEffect)
    setUploadedFiles(prev => prev.filter(file => !(file.status === 'completed' && selectedCompletedFileIds.has(file.id))));
    setSelectedCompletedFileIds(new Set());

    // Mostrar notificación con el total eliminado
    showNotification(`${selectedCompletedFiles.length} archivo(s) eliminado(s) correctamente.`, 'success');
  };

  const handleLogout = async () => {
    try {
      // SECURITY: Llamar a endpoint de logout para limpiar cookie httpOnly
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar datos locales no sensibles
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

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

  const downloadFilesOrganized = async (file: UploadedFile, job: Job, dirHandle: FileSystemDirectoryHandle, format: 'txt' | 'pdf' | 'both') => {
    try {
      // Create folder for this file
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const folderHandle = createSubfolders
        ? await dirHandle.getDirectoryHandle(baseName, { create: true })
        : dirHandle;

      // Helper to save a blob to a file handle
      const saveBlob = async (handle: any, blob: Blob) => {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      };

      // Download Transcription
      if (job.txt_url) {
        const textRes = await fetch(job.txt_url);
        const textContent = await textRes.text();
        if (format === 'pdf' || format === 'both') {
          const pdfBlob = await generatePdf('Transcripción', textContent, file.name);
          const pdfHandle = await folderHandle.getFileHandle(`${baseName}-transcripcion.pdf`, { create: true });
          await saveBlob(pdfHandle, pdfBlob);
        }
        if (format === 'txt' || format === 'both') {
          const txtBlob = new Blob([textContent], { type: 'text/plain' });
          const txtHandle = await folderHandle.getFileHandle(`${baseName}-transcripcion.txt`, { create: true });
          await saveBlob(txtHandle, txtBlob);
        }
      }

      // Download Summary
      if (job.summary_url) {
        const summaryRes = await fetch(job.summary_url);
        const summaryText = await summaryRes.text();
        if (format === 'pdf' || format === 'both') {
          const pdfBlob = await generatePdf('Resumen', summaryText, file.name);
          const pdfHandle = await folderHandle.getFileHandle(`${baseName}-resumen.pdf`, { create: true });
          await saveBlob(pdfHandle, pdfBlob);
        }
        if (format === 'txt' || format === 'both') {
          const txtBlob = new Blob([summaryText], { type: 'text/plain' });
          const txtHandle = await folderHandle.getFileHandle(`${baseName}-resumen.txt`, { create: true });
          await saveBlob(txtHandle, txtBlob);
        }
      }

      // Download Speakers Report
      if (job.speakers_url) {
        const speakersRes = await fetch(job.speakers_url);
        const speakersText = await speakersRes.text();
        if (format === 'pdf' || format === 'both') {
          const pdfBlob = await generatePdf('Análisis de Oradores', speakersText, file.name);
          const pdfHandle = await folderHandle.getFileHandle(`${baseName}-oradores.pdf`, { create: true });
          await saveBlob(pdfHandle, pdfBlob);
        }
        if (format === 'txt' || format === 'both') {
          const txtBlob = new Blob([speakersText], { type: 'text/plain' });
          const txtHandle = await folderHandle.getFileHandle(`${baseName}-oradores.txt`, { create: true });
          await saveBlob(txtHandle, txtBlob);
        }
      }
      
      // Download Tags
      if (job.metadata?.tags && job.metadata.tags.length > 0) {
        const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
        if (format === 'pdf' || format === 'both') {
          const pdfBlob = await generatePdf('Tags', tagsText, file.name);
          const pdfHandle = await folderHandle.getFileHandle(`${baseName}-tags.pdf`, { create: true });
          await saveBlob(pdfHandle, pdfBlob);
        }
        if (format === 'txt' || format === 'both') {
          const txtBlob = new Blob([tagsText], { type: 'text/plain' });
          const txtHandle = await folderHandle.getFileHandle(`${baseName}-tags.txt`, { create: true });
          await saveBlob(txtHandle, txtBlob);
        }
      }

      // Download SRT (always as .srt)
      if (job.srt_url) {
        const srtRes = await fetch(job.srt_url);
        const srtBlob = await srtRes.blob();
        const fileHandle = await folderHandle.getFileHandle(`${baseName}.srt`, { create: true });
        await saveBlob(fileHandle, srtBlob);
      }

      // Download VTT (always as .vtt)
      if (job.vtt_url) {
        const vttRes = await fetch(job.vtt_url);
        const vttBlob = await vttRes.blob();
        const fileHandle = await folderHandle.getFileHandle(`${baseName}.vtt`, { create: true });
        await saveBlob(fileHandle, vttBlob);
      }

      showNotification(`✅ Archivos para "${file.name}" guardados en la carpeta: ${baseName}`, 'success');

    } catch (error) {
      console.error('Error downloading organized files:', error);
      showNotification(`Error al descargar los archivos para "${file.name}". Inténtalo de nuevo.`, 'error');
    }
  };

  const downloadFilesIndividually = async (file: UploadedFile, job: Job, format: 'txt' | 'pdf' | 'both') => {
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

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    // Download Transcription
    if (job.txt_url) {
      const res = await fetch(job.txt_url);
      const text = await res.text();
      if (format === 'pdf' || format === 'both') {
        const pdfBlob = await generatePdf('Transcripción', text, file.name);
        triggerDownload(pdfBlob, `${baseName}-transcripcion.pdf`);
      }
      if (format === 'txt' || format === 'both') {
        const txtBlob = new Blob([text], { type: 'text/plain' });
        triggerDownload(txtBlob, `${baseName}-transcripcion.txt`);
      }
    }

    // Download Summary
    if (job.summary_url) {
      const res = await fetch(job.summary_url);
      const text = await res.text();
      if (format === 'pdf' || format === 'both') {
        const pdfBlob = await generatePdf('Resumen', text, file.name);
        triggerDownload(pdfBlob, `${baseName}-resumen.pdf`);
      }
      if (format === 'txt' || format === 'both') {
        const txtBlob = new Blob([text], { type: 'text/plain' });
        triggerDownload(txtBlob, `${baseName}-resumen.txt`);
      }
    }

    // Download Speakers Report
    if (job.speakers_url) {
      const res = await fetch(job.speakers_url);
      const text = await res.text();
      if (format === 'pdf' || format === 'both') {
        const pdfBlob = await generatePdf('Análisis de Oradores', text, file.name);
        triggerDownload(pdfBlob, `${baseName}-oradores.pdf`);
      }
      if (format === 'txt' || format === 'both') {
        const txtBlob = new Blob([text], { type: 'text/plain' });
        triggerDownload(txtBlob, `${baseName}-oradores.txt`);
      }
    }

    // Download Tags
    if (job.metadata?.tags && job.metadata.tags.length > 0) {
      const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
      if (format === 'pdf' || format === 'both') {
        const pdfBlob = await generatePdf('Tags', tagsText, file.name);
        triggerDownload(pdfBlob, `${baseName}-tags.pdf`);
      }
      if (format === 'txt' || format === 'both') {
        const txtBlob = new Blob([tagsText], { type: 'text/plain' });
        triggerDownload(txtBlob, `${baseName}-tags.txt`);
      }
    }

    // Always download other formats as-is
    if (job.srt_url) window.open(job.srt_url, '_blank');
    if (job.vtt_url) window.open(job.vtt_url, '_blank');
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return 'Subiendo';
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      case 'error': return 'Error';
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
      {/* Toast Notification - Positioned at top center */}
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
        <button
          onClick={() => router.push('/guia')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Guía de usuario"
        >
          <BookOpen className={`h-4 w-4 ${textSecondary}`} />
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Cambiar tema"
        >
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <button
          onClick={() => router.push('/pricing')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Ver planes y precios"
        >
          <span className="text-lg">💳</span>
        </button>
        <button
          onClick={() => router.push('/settings')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Ajustes"
        >
          <span className="text-lg">⚙️</span>
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Cerrar sesión"
        >
          <LogOut className={`h-4 w-4 ${textSecondary}`} />
        </button>
      </div>

      <div className="flex pt-10" style={{ height: '100vh' }}>
        <div className={`${bgSecondary} ${border} border-r p-6 flex flex-col`} style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
          
          <div className="flex flex-col mb-6">
            <div className="flex items-baseline gap-x-3">
              <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
              <span className={textSecondary}>trabajando para</span>
            </div>
            {(user?.name || user?.email) && (
              <p className={`${textPrimary} text-xl font-semibold -mt-1 ml-1`}>{user.name || user.email}</p>
            )}
          </div>

          <div className="mb-6">
            <div
              className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
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
                  onChange={handleFileChange}
                />
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
              <h2 className={`text-sm font-medium ${textPrimary}`}>Acciones IA</h2>
            </div>
            <p className={`text-xs ${textSecondary} mb-3`}>Selecciona archivos y aplica acciones.</p>

            <div className="space-y-2">
              {/* Fila 1: Transcribir + Oradores */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => !hasDocuments && handleApplyAction('Transcribir')}
                  className={`p-2 ${canTranscribe && !hasDocuments ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs font-medium transition-colors`}
                  disabled={!canTranscribe || hasDocuments}
                  title={hasDocuments ? 'No disponible para documentos' : 'Transcribir audio/video a texto'}
                >
                  📝 Transcribir
                </button>
                <button
                  onClick={() => !hasDocuments && handleApplyAction('Oradores')}
                  className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium transition-colors`}
                  disabled={hasDocuments}
                  title={hasDocuments ? 'No disponible para documentos' : 'Identificar y analizar hablantes'}
                >
                  🎙️ Oradores
                </button>
              </div>

              {/* Fila 2: Resumen + opciones Corto/Detallado */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyAction('Resumir')}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                  title="Generar resumen del contenido"
                >
                  📋 Resumen
                </button>
                <div className="flex items-center justify-around gap-1 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="accent-orange-500 scale-75"
                      name="summary"
                      checked={summaryType === 'short'}
                      onChange={() => setSummaryType('short')}
                    />
                    <span className={textSecondary}>Corto</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="accent-orange-500 scale-75"
                      name="summary"
                      checked={summaryType === 'detailed'}
                      onChange={() => setSummaryType('detailed')}
                    />
                    <span className={textSecondary}>Detallado</span>
                  </label>
                </div>
              </div>

              {/* Fila 3: Subtítulos + opciones SRT/VTT */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => !hasDocuments && handleApplyAction('Subtítulos')}
                  className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium transition-colors`}
                  disabled={hasDocuments}
                  title={hasDocuments ? 'No disponible para documentos' : 'Generar archivos de subtítulos'}
                >
                  📄 Subtítulos
                </button>
                <div className="flex items-center justify-around gap-1 text-xs">
                  <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500"
                      onChange={(e) => {
                        if (e.target.checked && !hasDocuments) handleApplyAction('SRT');
                      }}
                      disabled={hasDocuments}
                      title={hasDocuments ? 'No disponible para documentos' : 'Formato SRT'}
                    />
                    <span className={textSecondary}>SRT</span>
                  </label>
                  <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500"
                      onChange={(e) => {
                        if (e.target.checked && !hasDocuments) handleApplyAction('VTT');
                      }}
                      disabled={hasDocuments}
                      title={hasDocuments ? 'No disponible para documentos' : 'Formato VTT'}
                    />
                    <span className={textSecondary}>VTT</span>
                  </label>
                </div>
              </div>

              {/* Fila 4: Etiquetas + Archivos Procesados */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyAction('Etiquetas')}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                  title="Generar etiquetas temáticas"
                >
                  🏷️ Etiquetas
                </button>
                <Link
                  href="/processed-files"
                  className="flex items-center justify-center p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                  title="Ver todos los archivos procesados"
                >
                  ✅ Archivos Procesados
                </Link>
              </div>

              {/* Fila 5: Procesar Archivos - ancho completo */}
              <button
                onClick={handleProcessSelectedFiles}
                className="w-full p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors mt-2"
              >
                🚀 Procesar Archivos
              </button>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-800">
            <p className={`text-xs ${textSecondary} text-center mb-1`}>
              © 2025 Annalogica. Todos los derechos reservados.
            </p>
            <div className="flex justify-center gap-3 text-xs mb-2">
              <a href="/privacy" className={`${textSecondary} hover:text-orange-500`}>Privacidad</a>
              <a href="/terms" className={`${textSecondary} hover:text-orange-500`}>Términos</a>
              <a href="mailto:legal@annalogica.eu" className={`${textSecondary} hover:text-orange-500`}>Contacto</a>
            </div>
            <p className={`text-xs ${textSecondary} text-center`}>
              support@annalogica.eu
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
          <div className="mb-6 flex justify-start">
            <label htmlFor="language-select" className="sr-only">Idioma del Contenido</label>
            <select
                id="language-select"
                className={`p-2 ${bgSecondary} rounded-lg shadow-sm ${border} border ${textPrimary} text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ minWidth: '180px' }}
                title="Selecciona el idioma del audio/video"
            >
                <option value="auto">Detección automática</option>
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

          <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden mb-6`} style={{ flex: '1 1 60%', minHeight: '400px' }}>
            <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedUploadedFileIds.size === uploadedFiles.filter(f => f.status !== 'completed').length && uploadedFiles.filter(f => f.status !== 'completed').length > 0}
                    onChange={handleSelectAllUploaded}
                    className="form-checkbox h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-orange-500 text-sm">📁</span>
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Archivos Cargados</h2>
                </div>
                <p className={`text-xs ${textSecondary}`}>Archivos en proceso de subida y procesamiento</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const selectedFiles = uploadedFiles.filter(f => selectedUploadedFileIds.has(f.id) && f.status !== 'completed');
                    if (selectedFiles.length === 0) {
                      showNotification('Selecciona archivos para reiniciar su procesamiento', 'info');
                      return;
                    }
                    if (confirm(`¿Reiniciar el procesamiento de ${selectedFiles.length} archivo(s)?`)) {
                      setUploadedFiles(prev => prev.map(f => {
                        if (selectedUploadedFileIds.has(f.id) && f.status !== 'completed') {
                          return {
                            ...f,
                            status: 'pending' as FileStatus,
                            processingProgress: 0,
                            uploadProgress: 100,
                            processingStartTime: undefined,
                            estimatedTimeRemaining: undefined,
                            actions: []
                          };
                        }
                        return f;
                      }));
                      setSelectedUploadedFileIds(new Set());
                      showNotification('Archivos reiniciados. Selecciona acciones y procesa.', 'success');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                  title="Reiniciar procesamiento de archivos seleccionados"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reiniciar
                </button>
                <button
                  onClick={async () => {
                    const selectedFiles = uploadedFiles.filter(f => selectedUploadedFileIds.has(f.id));

                    if (selectedFiles.length === 0) {
                      showNotification('Selecciona archivos para eliminar', 'info');
                      return;
                    }

                    if (!confirm(`¿Eliminar ${selectedFiles.length} archivo(s) seleccionado(s)?`)) {
                      return;
                    }

                    // Separate completed from non-completed files
                    const completedFiles = selectedFiles.filter(f => f.status === 'completed' && f.jobId);
                    const nonCompletedFiles = selectedFiles.filter(f => f.status !== 'completed');

                    // Delete completed files from database
                    for (const file of completedFiles) {
                      try {
                        await fetch(`/api/processed-files/${file.jobId}`, {
                          method: 'DELETE',
                          credentials: 'include'
                        });
                      } catch (err) {
                        console.error(`Error deleting ${file.name}:`, err);
                      }
                    }

                    // Remove all selected files from state
                    setUploadedFiles(prev => prev.filter(f => !selectedUploadedFileIds.has(f.id)));
                    setSelectedUploadedFileIds(new Set());

                    const total = completedFiles.length + nonCompletedFiles.length;
                    showNotification(`${total} archivo(s) eliminado(s) correctamente`, 'success');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                  title="Eliminar archivos seleccionados"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 200px)' }}>
              {uploadedFiles.filter(f => f.status !== 'completed').length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className={`text-xs ${textSecondary}`}>No hay archivos cargados aún.</p>
                </div>
              ) : (
                uploadedFiles.filter(f => f.status !== 'completed').map((file) => (
                  <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
                    <div className="flex items-center gap-4 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedUploadedFileIds.has(file.id)}
                        onChange={() => handleFileSelect(file.id, 'uploaded')}
                        className="form-checkbox h-4 w-4 text-orange-500 rounded"
                      />
                      <span className={`text-xs ${textPrimary} flex-1 truncate`}>{file.name}</span>
                      {file.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-auto">
                          {file.actions.map(action => (
                            <span key={action} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {action}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`} style={{ minWidth: '100px' }}>
                        {getStatusText(file.status)}
                      </span>
                      <div className="flex items-center gap-2" style={{ minWidth: '80px' }}>
                        <button
                          onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                          className={`p-1 ${hover} rounded`}
                          title="Eliminar"
                        >
                          <Trash2 className={`h-3 w-3 ${textSecondary}`} />
                        </button>
                      </div>
                    </div>

                    <div className="ml-6 space-y-1">
                      {file.status === 'uploading' && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs ${textSecondary}`}>Subida</span>
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                              <span className="text-xs text-blue-500">{file.uploadProgress.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
                            <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${file.uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                      {file.status === 'processing' && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs ${textSecondary}`}>
                                {(file.processingProgress || 0) >= 98 ? '🟡 Finalizando...' : 'Procesando'}
                              </span>
                              {(file.processingProgress || 0) >= 98 && (
                                <span className={`text-xs ${textSecondary} italic`}>(Generando resumen)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(file.processingProgress || 0) >= 90 ? (
                                <span className="relative flex h-2 w-2" title="Finalizando - Generando resumen y oradores">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </span>
                              ) : (
                                <span className="relative flex h-2 w-2" title="Procesando - Transcribiendo audio">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                              <span className="text-xs text-purple-500">{file.processingProgress || 0}%</span>
                            </div>
                          </div>

                          {/* Timer, file size, and estimated time info */} 
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs ${textSecondary}`} title="Tiempo transcurrido">
                                ⏱️ {formatElapsedTime(file.processingStartTime)}
                              </span>
                              <span className={`text-xs ${textSecondary}`} title="Tamaño del archivo">
                                📦 {formatFileSize(file.fileSize)}
                              </span>
                            </div>
                            {file.estimatedTimeRemaining !== undefined && file.estimatedTimeRemaining > 0 && (
                              <span className={`text-xs ${textSecondary}`} title="Tiempo estimado restante">
                                ⏳ ~{formatTimeRemaining(file.estimatedTimeRemaining)}
                              </span>
                            )}
                          </div>

                          <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
                            <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${file.processingProgress || 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden`} style={{ flex: '1 1 40%', minHeight: '300px' }}>
            <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedCompletedFileIds.size === uploadedFiles.filter(f => f.status === 'completed').length && uploadedFiles.filter(f => f.status === 'completed').length > 0}
                    onChange={handleSelectAllCompleted}
                    className="form-checkbox h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-green-500 text-sm">✅</span>
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Todos los Archivos Completados</h2>
                </div>


                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs ${textSecondary}`}>Formato:</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="accent-orange-500 scale-75"
                      name="downloadFormat"
                      checked={downloadFormat === 'pdf'}
                      onChange={() => setDownloadFormat('pdf')}
                    />
                    <span className={`text-xs ${textSecondary}`}>PDF</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="accent-orange-500 scale-75"
                      name="downloadFormat"
                      checked={downloadFormat === 'txt'}
                      onChange={() => setDownloadFormat('txt')}
                    />
                    <span className={`text-xs ${textSecondary}`}>TXT</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="accent-orange-500 scale-75"
                      name="downloadFormat"
                      checked={downloadFormat === 'both'}
                      onChange={() => setDownloadFormat('both')}
                    />
                    <span className={`text-xs ${textSecondary}`}>Ambos</span>
                  </label>
                </div>


              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const completedFiles = uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id));
                    if (completedFiles.length === 0) {
                      showNotification('Selecciona al menos un archivo completado para descargar.', 'info');
                      return;
                    }

                    if (!downloadDirHandle && 'showDirectoryPicker' in window) {
                      showNotification('Por favor, elige una carpeta de destino primero usando el botón "📁 Carpeta Descarga".', 'info');
                      return;
                    }

                    for (const file of completedFiles) {
                      if (file.jobId) {
                        try {
                          const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
                          if (res.ok) {
                            const data = await res.json();
                            const job = data.job;
                            if (downloadDirHandle) {
                              await downloadFilesOrganized(file, job, downloadDirHandle, downloadFormat);
                            } else {
                              await downloadFilesIndividually(file, job, downloadFormat);
                            }
                          }
                        } catch (err) {
                          console.error('Error downloading files:', err);
                          showNotification(`Error al descargar ${file.name}.`, 'error');
                        }
                      }
                    }
                  }}
                  disabled={uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id)).length === 0}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
                >
                  📥 Descargar Seleccionados
                </button>
                <button
                  onClick={async () => {
                    if (!('showDirectoryPicker' in window)) {
                      showNotification('Tu navegador no soporta la selección de carpetas. Las descargas se realizarán individualmente.', 'info');
                      return;
                    }
                    try {
                      const handle = await (window as any).showDirectoryPicker();
                      setDownloadDirHandle(handle);
                      showNotification(`Carpeta de descarga seleccionada: "${handle.name}". Las próximas descargas se guardarán aquí.`, 'success');
                    } catch (err) {
                      console.error('Error al seleccionar la carpeta:', err);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                  title="Elegir carpeta de descarga"
                >
                  📁 Carpeta Descarga
                </button>
                <button
                  onClick={handleDeleteSelectedCompletedFiles}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                  title="Eliminar archivos procesados seleccionados"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 200px)' }}>
              {uploadedFiles.filter(f => f.status === 'completed').length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className={`text-xs ${textSecondary}`}>No hay archivos completados aún.</p>
                </div>
              ) : (
                uploadedFiles.filter(f => f.status === 'completed').map((file) => (
                  <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedCompletedFileIds.has(file.id)}
                        onChange={() => handleFileSelect(file.id, 'completed')}
                        className="form-checkbox h-4 w-4 text-orange-500 rounded"
                      />
                      <span className={`text-xs ${textPrimary} flex-1 truncate`}>{file.name}</span>
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                        ✓ Completado
                      </span>
                      <button
                        onClick={async () => {
                          if (!file.jobId) return;

                          if (!downloadDirHandle && 'showDirectoryPicker' in window) {
                            showNotification('Por favor, elige una carpeta de destino primero usando el botón "📁 Carpeta Descarga".', 'info');
                            return;
                          }

                          try {
                            const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
                            if (res.ok) {
                              const data = await res.json();
                              const job = data.job;
                              if (downloadDirHandle) {
                                await downloadFilesOrganized(file, job, downloadDirHandle, downloadFormat);
                              } else {
                                await downloadFilesIndividually(file, job, downloadFormat);
                              }
                            }
                          } catch (err) {
                            console.error('Error downloading file:', err);
                            showNotification(`Error al descargar ${file.name}.`, 'error');
                          }
                        }}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        📥 Descargar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}