
    1 'use client';
      2
      3 import { useState, useEffect, useCallback } from 'react';
      4 import { useRouter } from 'next/navigation';
      5 import Link from 'next/link';
      6 import { RefreshCw, Trash2, Sun, Moon, BookOpen, LogOut } from 'lucide-react';
      7 import jsPDF from 'jspdf';
      8
      9 // AssemblyAI + Inngest - Arquitectura asíncrona con polling
     10
     11 type FileStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'error';
     12
     13 interface UploadedFile {
     14   id: string;
     15   name: string;
     16   uploadProgress: number;
     17   processingProgress?: number; // Add processing progress
     18   status: FileStatus;
     19   date: string;
     20   fileType: 'audio' | 'video' | 'text'; // New: Store file type
     21   actions: string[]; // New: Store selected actions for the file
     22   jobId?: string; // Add jobId to link to details page
     23   blobUrl?: string; // Store blob URL for processing
     24   audioDuration?: number; // Store audio duration for progress calculation
     25   fileSize?: number; // Store original file size in bytes
     26   processingStartTime?: number; // Store when processing started (timestamp)
     27   estimatedTimeRemaining?: number; // Estimated seconds remaining
     28 }
     29
     30 interface Job {
     31   txt_url?: string;
     32   srt_url?: string;
     33   vtt_url?: string;
     34   summary_url?: string;
     35   speakers_url?: string;
     36   metadata?: {
     37     tags?: string[];
     38   };
     39 }
     40
     41 interface User {
     42   id: string;
     43   name: string | null;
     44   email: string;
     45 }
     46
     47 export default function Dashboard() {
     48   const router = useRouter();
     49   const [user, setUser] = useState<User | null>(null);
     50   const [loading, setLoading] = useState(true);
     51   const [darkMode, setDarkMode] = useState(true);
     52   const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Keep this state
     53
     54   // Load files from localStorage on initial render
     55   useEffect(() => {
     56     try {
     57       const savedFiles = localStorage.getItem('uploadedFiles');
     58       if (savedFiles) {
     59         const parsedFiles: UploadedFile[] = JSON.parse(savedFiles);
     60         // Reset progress for files that were uploading or processing
     61         const restoredFiles = parsedFiles.map(file => {
     62           if (file.status === 'uploading' || file.status === 'processing') {
     63             return { ...file, status: 'error' as FileStatus, uploadProgress: 0, processingProgress: 0 };
     64           }
     65           return file;
     66         });
     67         setUploadedFiles(restoredFiles);
     68       }
     69     } catch (error) {
     70       console.error('Error loading files from localStorage:', error);
     71     }
     72   }, []);
     73
     74   // Save files to localStorage whenever they change
     75   useEffect(() => {
     76     try {
     77       localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
     78     } catch (error) {
     79       console.error('Error saving files to localStorage:', error);
     80     }
     81   }, [uploadedFiles]);
     82
     83   const [selectedUploadedFileIds, setSelectedUploadedFileIds] = useState<Set<string>>(new Set());
     84   const [selectedCompletedFileIds, setSelectedCompletedFileIds] = useState<Set<string>>(new Set());
     85   const [error, setError] = useState<string | null>(null);
     86   const [language, setLanguage] = useState('es');
     87   const [targetLanguage, setTargetLanguage] = useState('en');
     88   const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
     89   const [downloadFormat, setDownloadFormat] = useState<'txt' | 'pdf' | 'both'>('pdf');
     90   const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
     91   const [createSubfolders, setCreateSubfolders] = useState(true);
     92   const [timerTick, setTimerTick] = useState(0); // Force re-render for timer updates
     93   const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);
     94
     95   // Show notification function
     96   const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
     97     setNotification({ message, type });
     98     setTimeout(() => setNotification(null), 4000); // Auto-hide after 4 seconds
     99   };
    100
    101   useEffect(() => {
    102     // SECURITY: Verificar autenticación mediante cookie httpOnly
    103     const checkAuth = async () => {
    104       try {
    105         const res = await fetch('/api/auth/me', {
    106           credentials: 'include' // Importante: incluir cookies
    107         });
    108
    109         if (!res.ok) {
    110           router.push('/login');
    111           return;
    112         }
    113
    114         const data = await res.json();
    115         setUser(data.user);
    116         // Guardar datos del usuario en localStorage (no sensible)
    117         localStorage.setItem('user', JSON.stringify(data.user));
    118         setLoading(false);
    119       } catch (error) {
    120         console.error('Error verificando autenticación:', error);
    121         router.push('/login');
    122       }
    123     };
    124
    125     checkAuth();
    126   }, [router]);
    127
    128   // Update timer every second for files being processed
    129   useEffect(() => {
    130     const hasProcessingFiles = uploadedFiles.some(f => f.status === 'processing' && f.processingStartTime);
    131     if (!hasProcessingFiles) return;
    132
    133     const interval = setInterval(() => {
    134       setTimerTick(prev => prev + 1);
    135     }, 1000);
    136
    137     return () => clearInterval(interval);
    138   }, [uploadedFiles]);
    139
    140   // Polling para actualizar estado de jobs activos
    141   useEffect(() => {
    142     // Filtrar archivos que necesitan polling (tienen jobId y están pending o processing)
    143     const activeJobs = uploadedFiles.filter(
    144       f => f.jobId && (f.status === 'pending' || f.status === 'processing')
    145     );
    146
    147     if (activeJobs.length === 0) return;
    148
    149     const pollJobs = async () => {
    150       for (const file of activeJobs) {
    151         try {
    152           // SECURITY: Cookie httpOnly se envía automáticamente
    153           const res = await fetch(`/api/jobs/${file.jobId}`, {
    154             credentials: 'include'
    155           });
    156
    157           if (!res.ok) {
    158             const errorData = await res.json();
    159             console.error('[Polling] API Error for job:', file.jobId, errorData.error || res.statusText);
    160             setUploadedFiles(prev => prev.map(f =>
    161               f.id === file.id ? { ...f, status: 'error' as FileStatus, processingProgress: 0 } : f
    162             ));
    163             continue;
    164           }
    165
    166           const data = await res.json();
    167           if (!data.job) {
    168             console.error('[Polling] Invalid response data for job:', file.jobId, data);
    169             setUploadedFiles(prev => prev.map(f =>
    170               f.id === file.id ? { ...f, status: 'error' as FileStatus, processingProgress: 0 } : f
    171             ));
    172             continue;
    173           }
    174           const job = data.job;
    175
    176           // Auto-restart logic: Check if job is stuck (no progress for too long)
    177           if (file.processingStartTime) {
    178             const timeSinceStart = (Date.now() - file.processingStartTime) / 1000; // seconds
    179             const audioDuration = job.audio_duration_seconds || 60;
    180             const maxExpectedTime = audioDuration * 0.5; // 0.5x multiplier (very generous timeout)
    181             const timeoutThreshold = Math.max(maxExpectedTime, 1200); // At least 20 minutes
    182
    183             // If job is stuck for too long (beyond reasonable processing time)
    184             if (timeSinceStart > timeoutThreshold && (job.status === 'processing' || job.status === 'pending')) {
    185               console.warn(`[Auto-restart] Job ${file.jobId} appears stuck (${Math.floor(timeSinceStart)}s elapsed, expected ~${Math.floor(maxExpectedTime)}s)`);
    186
    187               // TODO: Implement retry/restart API endpoint
    188               // For now, just log it
    189               setError(`Archivo "${file.name}" parece estar bloqueado. Por favor, intenta procesarlo de nuevo.`);
    190             }
    191           }
    192
    193           // Map job status to FileStatus
    194           let newStatus: FileStatus = file.status;
    195           let processingProgress = file.processingProgress || 0;
    196           let processingStartTime = file.processingStartTime;
    197           let estimatedTimeRemaining = file.estimatedTimeRemaining;
    198
    199           // Check if this is a document (PDF, DOCX, TXT)
    200           const isDocument = file.fileType === 'text' || job.metadata?.isDocument;
    201
    202           if (job.status === 'processing' || job.status === 'transcribed') {
    203             newStatus = 'processing';
    204
    205             // Set processing start time if not already set
    206             if (!processingStartTime) {
    207               processingStartTime = Date.now();
    208             }
    209
    210             const createdAt = new Date(job.created_at).getTime();
    211             const now = Date.now();
    212             const elapsed = (now - createdAt) / 1000; // seconds
    213
    214             if (isDocument) {
    215               // Document processing: Simpler progress model
    216               // Documents typically process faster than audio
    217               const estimatedDocTime = 30; // ~30 seconds for document processing
    218
    219               if (job.status === 'transcribed') {
    220                 // Document text extracted, generating summary/tags
    221                 processingProgress = 95;
    222                 estimatedTimeRemaining = 5;
    223               } else {
    224                 // Extract + parse phase
    225                 const baseProgress = Math.floor((elapsed / estimatedDocTime) * 100);
    226                 processingProgress = Math.min(90, baseProgress);
    227                 const remainingProgress = 100 - processingProgress;
    228                 estimatedTimeRemaining = Math.ceil((remainingProgress / 100) * estimatedDocTime);
    229               }
    230             } else {
    231               // Audio/Video processing: Use audio duration
    232               const audioDuration = job.audio_duration_seconds || 60;
    233               const estimatedTotalTime = audioDuration * 0.25;
    234
    235               if (job.status === 'transcribed') {
    236                 processingProgress = 98;
    237                 estimatedTimeRemaining = 5;
    238               } else {
    239                 const baseProgress = Math.floor((elapsed / estimatedTotalTime) * 100);
    240                 processingProgress = Math.min(98, baseProgress);
    241                 const remainingProgress = 100 - processingProgress;
    242                 estimatedTimeRemaining = Math.ceil((remainingProgress / 100) * estimatedTotalTime);
    243               }
    244             }
    245           } else if (job.status === 'completed' || job.status === 'summarized') {
    246             newStatus = 'completed';
    247             processingProgress = 100;
    248             estimatedTimeRemaining = 0;
    249           } else if (job.status === 'failed' || job.status === 'error') {
    250             newStatus = 'error';
    251           }
    252
    253           // Update file status and progress if changed
    254           if (newStatus !== file.status || processingProgress !== file.processingProgress || estimatedTimeRemaining !== file.estimatedTimeRemaining) {
    255             setUploadedFiles(prev => prev.map(f =>
    256               f.id === file.id ? {
    257                 ...f,
    258                 status: newStatus,
    259                 processingProgress,
    260                 audioDuration: job.audio_duration_seconds,
    261                 processingStartTime,
    262                 estimatedTimeRemaining
    263               } : f
    264             ));
    265           }
    266         } catch (err) {
    267           console.error('[Polling] Error fetching job:', file.jobId, err);
    268         }
    269       }
    270     };
    271
    272     // Poll immediately and then every 5 seconds
    273     pollJobs();
    274     const interval = setInterval(pollJobs, 5000);
    275
    276     return () => clearInterval(interval);
    277   }, [uploadedFiles]);
    278
    279   const getFileType = (mimeType: string, filename: string): 'audio' | 'video' | 'text' => {
    280     // Check MIME type first
    281     if (mimeType.startsWith('audio/')) return 'audio';
    282     if (mimeType.startsWith('video/')) return 'video';
    283     if (mimeType.startsWith('text/') || mimeType === 'application/pdf' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return
        'text';
    284
    285     // Fallback: check file extension (some browsers don't report MIME type correctly for PDFs)
    286     const ext = filename.toLowerCase().split('.').pop();
    287     if (ext === 'pdf' || ext === 'txt' || ext === 'docx') return 'text';
    288     if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext || '')) return 'audio';
    289     if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')) return 'video';
    290
    291     return 'text'; // Default to text if unknown
    292   };
    293
    294   // Helper function to format file size
    295   const formatFileSize = (bytes?: number): string => {
    296     if (!bytes) return '0 KB';
    297     const kb = bytes / 1024;
    298     const mb = kb / 1024;
    299     const gb = mb / 1024;
    300
    301     if (gb >= 1) return `${gb.toFixed(2)} GB`;
    302     if (mb >= 1) return `${mb.toFixed(2)} MB`;
    303     return `${kb.toFixed(2)} KB`;
    304   };
    305
    306   // Helper function to format elapsed time
    307   const formatElapsedTime = (startTime?: number): string => {
    308     if (!startTime) return '0:00';
    309     const elapsed = Math.floor((Date.now() - startTime) / 1000); // seconds
    310     const minutes = Math.floor(elapsed / 60);
    311     const seconds = elapsed % 60;
    312     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    313   };
    314
    315   // Helper function to format time remaining
    316   const formatTimeRemaining = (seconds?: number): string => {
    317     if (!seconds || seconds <= 0) return '0:00';
    318     const minutes = Math.floor(seconds / 60);
    319     const secs = Math.floor(seconds % 60);
    320     return `${minutes}:${secs.toString().padStart(2, '0')}`;
    321   };
    322
    323   const processFiles = useCallback(async (files: FileList | null) => {
    324     if (!files || files.length === 0) return;
    325
    326     setError(null);
    327
    328     try {
    329       // SECURITY: No necesitamos token, la cookie httpOnly se envía automáticamente
    330
    331       // Create all file entries first
    332       const filesToUpload = Array.from(files).map((file, i) => {
    333         const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
    334         const detectedType = getFileType(file.type, file.name);
    335         console.log(`[Upload] File: ${file.name}, MIME: ${file.type}, Detected type: ${detectedType}`);
    336
    337         const newFile: UploadedFile = {
    338           id: fileId,
    339           name: file.name,
    340           uploadProgress: 0,
    341           status: 'uploading',
    342           date: new Date().toISOString(),
    343           fileType: detectedType,
    344           actions: [],
    345           fileSize: file.size // Capture file size in bytes
    346         };
    347         return { file, fileId, newFile };
    348       });
    349
    350       // Add all files to state at once
    351       setUploadedFiles(prev => [...prev, ...filesToUpload.map(f => f.newFile)]);
    352
    353       // Upload all files in parallel
    354       const { upload } = await import('@vercel/blob/client');
    355
    356       const uploadPromises = filesToUpload.map(async ({ file, fileId }) => {
    357         try {
    358           const timestamp = Date.now();
    359           const randomSuffix = Math.random().toString(36).substring(2, 8);
    360           const uniqueFilename = `${timestamp}-${randomSuffix}-${file.name}`;
    361
    362           const blob = await upload(uniqueFilename, file, {
    363             access: 'public',
    364             handleUploadUrl: '/api/blob-upload',
    365             clientPayload: JSON.stringify({
    366               size: file.size,
    367               type: file.type,
    368             }),
    369             onUploadProgress: ({ percentage }) => {
    370               setUploadedFiles(prev => prev.map(f =>
    371                 f.id === fileId ? { ...f, uploadProgress: percentage } : f
    372               ));
    373             },
    374           });
    375
    376           // Update with blobUrl
    377           setUploadedFiles(prev => prev.map(f =>
    378             f.id === fileId ? { ...f, uploadProgress: 100, status: 'pending', blobUrl: blob.url } : f
    379           ));
    380         } catch (err: any) {
    381           console.error(`Error uploading ${file.name}:`, err);
    382           setUploadedFiles(prev => prev.map(f =>
    383             f.id === fileId ? { ...f, status: 'error' } : f
    384           ));
    385         }
    386       });
    387
    388       await Promise.all(uploadPromises);
    389
    390     } catch (err: any) {
    391       setError(err.message);
    392       setUploadedFiles(prev => prev.map(f =>
    393         f.id === (files && files[0] ? files[0].name : '') ? { ...f, status: 'error' } : f // This needs to be fixed for multiple files
    394       ));
    395     }
    396   }, [router]);
    397
    398   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    399     processFiles(e.target.files);
    400     e.target.value = ''; // Clear input to allow re-uploading same file
    401   };
    402
    403   const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    404     e.preventDefault();
    405     e.stopPropagation();
    406     processFiles(e.dataTransfer.files);
    407   }, [processFiles]);
    408
    409   const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    410     e.preventDefault();
    411     e.stopPropagation();
    412   }, []);
    413
    414   const handleFileSelect = (fileId: string, type: 'uploaded' | 'completed') => {
    415     if (type === 'uploaded') {
    416       setSelectedUploadedFileIds(prev => {
    417         const newSet = new Set(prev);
    418         if (newSet.has(fileId)) {
    419           newSet.delete(fileId);
    420         } else {
    421           newSet.add(fileId);
    422         }
    423         return newSet;
    424       });
    425     } else { // type === 'completed'
    426       setSelectedCompletedFileIds(prev => {
    427         const newSet = new Set(prev);
    428         if (newSet.has(fileId)) {
    429           newSet.delete(fileId);
    430         } else {
    431           newSet.add(fileId);
    432         }
    433         return newSet;
    434       });
    435     }
    436   };
    437
    438   const handleSelectAllUploaded = () => {
    439     const currentUploadedFiles = uploadedFiles.filter(f => f.status !== 'completed');
    440     if (selectedUploadedFileIds.size === currentUploadedFiles.length) {
    441       setSelectedUploadedFileIds(new Set()); // Deselect all uploaded
    442     } else {
    443       setSelectedUploadedFileIds(new Set(currentUploadedFiles.map(file => file.id))); // Select all uploaded
    444     }
    445   };
    446
    447   const handleSelectAllCompleted = () => {
    448     const currentCompletedFiles = uploadedFiles.filter(f => f.status === 'completed');
    449     if (selectedCompletedFileIds.size === currentCompletedFiles.length) {
    450       setSelectedCompletedFileIds(new Set()); // Deselect all completed
    451     } else {
    452       setSelectedCompletedFileIds(new Set(currentCompletedFiles.map(file => file.id))); // Select all completed
    453     }
    454   };
    455
    456   const handleApplyAction = (actionName: string) => {
    457     setUploadedFiles(prevFiles =>
    458       prevFiles.map(file =>
    459         selectedUploadedFileIds.has(file.id)
    460           ? {
    461               ...file,
    462               actions: file.actions.includes(actionName)
    463                 ? file.actions.filter(a => a !== actionName) // Deselect if already selected
    464                 : [...file.actions, actionName],
    465             }
    466           : file
    467       )
    468     );
    469   };
    470
    471   const handleProcessSelectedFiles = async () => {
    472     console.log('[Process] Button clicked! Selected files:', selectedUploadedFileIds.size);
    473     console.log('[Process] Uploaded files:', uploadedFiles.map(f => ({ id: f.id, name: f.name, actions: f.actions, blobUrl: f.blobUrl, fileType: f.fileType })));
    474
    475     if (selectedUploadedFileIds.size === 0) {
    476       showNotification('Por favor, selecciona al menos un archivo para procesar.', 'info');
    477       return;
    478     }
    479
    480     const filesToProcess = uploadedFiles.filter(file => selectedUploadedFileIds.has(file.id));
    481     console.log('[Process] Files to process (after filter):', filesToProcess.map(f => ({ name: f.name, actions: f.actions, fileType: f.fileType })));
    482
    483     // Verificar que tengan acciones seleccionadas
    484     const filesWithoutActions = filesToProcess.filter(f => f.actions.length === 0);
    485     if (filesWithoutActions.length > 0) {
    486       console.log('[Process] Files without actions:', filesWithoutActions.map(f => f.name));
    487       showNotification('Selecciona al menos una acción (Oradores, Resumen, Subtítulos, Etiquetas).', 'error');
    488       return;
    489     }
    490
    491     // Verificar que tengan blobUrl
    492     const filesWithoutUrl = filesToProcess.filter(f => !f.blobUrl);
    493     if (filesWithoutUrl.length > 0) {
    494       console.log('[Process] Files without blobUrl:', filesWithoutUrl.map(f => f.name));
    495       showNotification('Algunos archivos no se cargaron correctamente. Por favor, recárgalos.', 'error');
    496       return;
    497     }
    498
    499     setError(null);
    500
    501     console.log('[Process] ✅ All validations passed! Starting processing...');
    502     console.log('[Process] Files to process:', filesToProcess.map(f => ({ name: f.name, actions: f.actions, fileType: f.fileType, blobUrl: f.blobUrl })));
    503
    504     let processedCount = 0;
    505
    506     // Procesar archivos según su tipo
    507     for (const file of filesToProcess) {
    508       console.log('[Process] Processing file:', file.name, 'Type:', file.fileType, 'Actions:', file.actions);
    509
    510       try {
    511         console.log('[Process] 🚀 Processing file:', file.name, 'blobUrl:', file.blobUrl);
    512
    513         // Determinar si es documento o audio/video
    514         const isDocument = file.fileType === 'text';
    515         console.log('[Process] Is document?', isDocument, 'fileType:', file.fileType);
    516
    517         if (isDocument) {
    518           // Procesar como documento (PDF, TXT, DOCX) - SERVER-SIDE PROCESSING
    519           console.log('[Process] 📄 Processing as DOCUMENT (server-side with multi-layer fallback)');
    520
    521           // Validar que las acciones sean apropiadas para documentos
    522           const invalidActions = file.actions.filter(a =>
    523             a === 'Transcribir' || a === 'Oradores' || a === 'Subtítulos' || a === 'SRT' || a === 'VTT'
    524           );
    525
    526           if (invalidActions.length > 0) {
    527             throw new Error(`Las acciones ${invalidActions.join(', ')} no están disponibles para documentos de texto. Solo puedes usar Resumen y Etiquetas.`);
    528           }
    529
    530           // Send document URL to server for processing (same as audio/video)
    531           // Server will download, parse with multi-layer fallback, and process
    532           const processRes = await fetch('/api/process-document', {
    533             method: 'POST',
    534             headers: {
    535               'Content-Type': 'application/json'
    536             },
    537             credentials: 'include',
    538             body: JSON.stringify({
    539               blobUrl: file.blobUrl,
    540               fileName: file.name,
    541               actions: file.actions,
    542               summaryType: summaryType,
    543               language: language
    544             })
    545           });
    546
    547           console.log('[Process] Document API Response status:', processRes.status);
    548
    549           if (!processRes.ok) {
    550             const errorData = await processRes.json();
    551             console.error('[Process] Document API Error:', errorData);
    552             throw new Error(errorData.error || 'Error al procesar documento');
    553           }
    554
    555           const responseData = await processRes.json();
    556           console.log('[Process] Document API Response data:', responseData);
    557
    558           const jobId = responseData.jobId;
    559           console.log('[Process] ✅ Document job created:', jobId, file.name);
    560           processedCount++;
    561
    562           // Update file with jobId
    563           setUploadedFiles(prev => prev.map(f => {
    564             if (f.id === file.id) {
    565               console.log('[Process] MATCH! Updating file:', f.id, 'with jobId:', jobId);
    566               return { ...f, jobId, status: 'processing' as const };
    567             }
    568             return f;
    569           }));
    570
    571         } else {
    572           // Procesar como audio/video (la transcripción se hace siempre internamente)
    573           console.log('[Process] 🎵 Processing as AUDIO/VIDEO');
    574
    575           // SECURITY: Cookie httpOnly se envía automáticamente
    576           const processRes = await fetch('/api/process', {
    577             method: 'POST',
    578             headers: {
    579               'Content-Type': 'application/json'
    580             },
    581             credentials: 'include',
    582             body: JSON.stringify({
    583               audioUrl: file.blobUrl,
    584               filename: file.name,
    585               language: language,
    586               actions: file.actions,
    587               summaryType: summaryType
    588             })
    589           });
    590
    591           console.log('[Process] API Response status:', processRes.status);
    592
    593           if (!processRes.ok) {
    594             const errorData = await processRes.json();
    595             console.error('[Process] API Error:', errorData);
    596             throw new Error(errorData.error || 'Error al procesar');
    597           }
    598
    599           const responseData = await processRes.json();
    600           console.log('[Process] API Response data:', responseData);
    601
    602           // API wraps response in { success, data: { jobId, status, message } }
    603           const jobId = responseData.data?.jobId || responseData.jobId;
    604           console.log('[Process] ✅ Job created:', jobId, file.name);
    605           processedCount++;
    606
    607           // Update file with jobId
    608           setUploadedFiles(prev => prev.map(f => {
    609             if (f.id === file.id) {
    610               console.log('[Process] MATCH! Updating file:', f.id, 'with jobId:', jobId);
    611               return { ...f, jobId, status: 'pending' as const };
    612             }
    613             return f;
    614           }));
    615         }
    616
    617       } catch (err: any) {
    618         console.error('[Process] ❌ Error:', err);
    619         setError(`Error procesando ${file.name}: ${err.message}`);
    620         setUploadedFiles(prev => prev.map(f =>
    621           f.id === file.id ? { ...f, status: 'error' } : f
    622         ));
    623       }
    624     }
    625
    626     console.log('[Process] 🏁 Finished! Processed', processedCount, 'files');
    627
    628     if (processedCount > 0) {
    629       showNotification(`${processedCount} archivo(s) enviado(s) a procesamiento. Ver progreso abajo.`, 'success');
    630     } else {
    631       showNotification('No se procesó ningún archivo. Verifica las acciones seleccionadas.', 'error');
    632     }
    633
    634     // Deselect all after processing
    635     setSelectedUploadedFileIds(new Set());
    636   };
    637
    638
    639
    640   const handleDeleteSelectedCompletedFiles = async () => {
    641     const selectedCompletedFiles = uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id));
    642
    643     if (selectedCompletedFiles.length === 0) {
    644       showNotification('Selecciona al menos un archivo completado para eliminar.', 'info');
    645       return;
    646     }
    647
    648     // Delete completed files from database (only if they have jobId)
    649     let dbDeletions = 0;
    650     for (const file of selectedCompletedFiles) {
    651       if (file.jobId) {
    652         try {
    653           const res = await fetch(`/api/processed-files/${file.jobId}`, {
    654             method: 'DELETE',
    655             credentials: 'include'
    656           });
    657
    658           if (res.ok) {
    659             dbDeletions++;
    660           }
    661           // Si falla, no mostramos error - solo lo eliminamos del localStorage
    662         } catch (err: any) {
    663           console.error(`Error deleting job ${file.jobId}:`, err);
    664           // No mostramos notificación de error, seguimos eliminando
    665         }
    666       }
    667     }
    668
    669     // Remove ALL selected files from state (this will also update localStorage via useEffect)
    670     setUploadedFiles(prev => prev.filter(file => !(file.status === 'completed' && selectedCompletedFileIds.has(file.id))));
    671     setSelectedCompletedFileIds(new Set());
    672
    673     // Mostrar notificación con el total eliminado
    674     showNotification(`${selectedCompletedFiles.length} archivo(s) eliminado(s) correctamente.`, 'success');
    675   };
    676
    677   const handleLogout = async () => {
    678     try {
    679       // SECURITY: Llamar a endpoint de logout para limpiar cookie httpOnly
    680       await fetch('/api/auth/logout', {
    681         method: 'POST',
    682         credentials: 'include'
    683       });
    684     } catch (error) {
    685       console.error('Error en logout:', error);
    686     } finally {
    687       // Limpiar datos locales no sensibles
    688       localStorage.removeItem('user');
    689       router.push('/login');
    690     }
    691   };
    692
    693   const generatePdf = async (title: string, text: string, filename: string) => {
    694     try {
    695       const doc = new jsPDF({
    696         orientation: 'p',
    697         unit: 'mm',
    698         format: 'a4'
    699       });
    700
    701       const margin = 20;
    702       const pageWidth = doc.internal.pageSize.getWidth();
    703       const pageHeight = doc.internal.pageSize.getHeight();
    704       const usableWidth = pageWidth - (margin * 2);
    705       let yPosition = margin;
    706
    707       // Header
    708       doc.setFont('Helvetica', 'bold');
    709       doc.setFontSize(16);
    710       doc.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
    711       yPosition += 10;
    712
    713       // Metadata
    714       doc.setFont('Helvetica', 'normal');
    715       doc.setFontSize(11);
    716       doc.text(`Archivo: ${filename}`, margin, yPosition);
    717       yPosition += 5;
    718       doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
    719       yPosition += 10;
    720
    721       doc.line(margin, yPosition, pageWidth - margin, yPosition);
    722       yPosition += 10;
    723
    724       // Body
    725       doc.setFontSize(10);
    726       const splitText = doc.splitTextToSize(text, usableWidth);
    727
    728       for (let i = 0; i < splitText.length; i++) {
    729         if (yPosition > pageHeight - margin) {
    730           doc.addPage();
    731           yPosition = margin;
    732         }
    733         doc.text(splitText[i], margin, yPosition);
    734         yPosition += 5;
    735       }
    736
    737       return doc.output('blob');
    738     } catch (error) {
    739       console.error(`Error generando PDF para "${title}":`, error);
    740       throw error;
    741     }
    742   };
    743
    744   const downloadFilesOrganized = async (file: UploadedFile, job: Job, dirHandle: FileSystemDirectoryHandle, format: 'txt' | 'pdf' | 'both') => {
    745     try {
    746       // Create folder for this file
    747       const baseName = file.name.replace(/\.[^/.]+$/, '');
    748       const folderHandle = createSubfolders
    749         ? await dirHandle.getDirectoryHandle(baseName, { create: true })
    750         : dirHandle;
    751
    752       // Helper to save a blob to a file handle
    753       const saveBlob = async (handle: any, blob: Blob) => {
    754         const writable = await handle.createWritable();
    755         await writable.write(blob);
    756         await writable.close();
    757       };
    758
    759       // Download Transcription
    760       if (job.txt_url) {
    761         const textRes = await fetch(job.txt_url);
    762         const textContent = await textRes.text();
    763         if (format === 'pdf' || format === 'both') {
    764           const pdfBlob = await generatePdf('Transcripción', textContent, file.name);
    765           const pdfHandle = await folderHandle.getFileHandle(`${baseName}-transcripcion.pdf`, { create: true });
    766           await saveBlob(pdfHandle, pdfBlob);
    767         }
    768         if (format === 'txt' || format === 'both') {
    769           const txtBlob = new Blob([textContent], { type: 'text/plain' });
    770           const txtHandle = await folderHandle.getFileHandle(`${baseName}-transcripcion.txt`, { create: true });
    771           await saveBlob(txtHandle, txtBlob);
    772         }
    773       }
    774
    775       // Download Summary
    776       if (job.summary_url) {
    777         const summaryRes = await fetch(job.summary_url);
    778         const summaryText = await summaryRes.text();
    779         if (format === 'pdf' || format === 'both') {
    780           const pdfBlob = await generatePdf('Resumen', summaryText, file.name);
    781           const pdfHandle = await folderHandle.getFileHandle(`${baseName}-resumen.pdf`, { create: true });
    782           await saveBlob(pdfHandle, pdfBlob);
    783         }
    784         if (format === 'txt' || format === 'both') {
    785           const txtBlob = new Blob([summaryText], { type: 'text/plain' });
    786           const txtHandle = await folderHandle.getFileHandle(`${baseName}-resumen.txt`, { create: true });
    787           await saveBlob(txtHandle, txtBlob);
    788         }
    789       }
    790
    791       // Download Speakers Report
    792       if (job.speakers_url) {
    793         const speakersRes = await fetch(job.speakers_url);
    794         const speakersText = await speakersRes.text();
    795         if (format === 'pdf' || format === 'both') {
    796           const pdfBlob = await generatePdf('Análisis de Oradores', speakersText, file.name);
    797           const pdfHandle = await folderHandle.getFileHandle(`${baseName}-oradores.pdf`, { create: true });
    798           await saveBlob(pdfHandle, pdfBlob);
    799         }
    800         if (format === 'txt' || format === 'both') {
    801           const txtBlob = new Blob([speakersText], { type: 'text/plain' });
    802           const txtHandle = await folderHandle.getFileHandle(`${baseName}-oradores.txt`, { create: true });
    803           await saveBlob(txtHandle, txtBlob);
    804         }
    805       }
    806
    807       // Download Tags
    808       if (job.metadata?.tags && job.metadata.tags.length > 0) {
    809         const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
    810         if (format === 'pdf' || format === 'both') {
    811           const pdfBlob = await generatePdf('Tags', tagsText, file.name);
    812           const pdfHandle = await folderHandle.getFileHandle(`${baseName}-tags.pdf`, { create: true });
    813           await saveBlob(pdfHandle, pdfBlob);
    814         }
    815         if (format === 'txt' || format === 'both') {
    816           const txtBlob = new Blob([tagsText], { type: 'text/plain' });
    817           const txtHandle = await folderHandle.getFileHandle(`${baseName}-tags.txt`, { create: true });
    818           await saveBlob(txtHandle, txtBlob);
    819         }
    820       }
    821
    822       // Download SRT (always as .srt)
    823       if (job.srt_url) {
    824         const srtRes = await fetch(job.srt_url);
    825         const srtBlob = await srtRes.blob();
    826         const fileHandle = await folderHandle.getFileHandle(`${baseName}.srt`, { create: true });
    827         await saveBlob(fileHandle, srtBlob);
    828       }
    829
    830       // Download VTT (always as .vtt)
    831       if (job.vtt_url) {
    832         const vttRes = await fetch(job.vtt_url);
    833         const vttBlob = await vttRes.blob();
    834         const fileHandle = await folderHandle.getFileHandle(`${baseName}.vtt`, { create: true });
    835         await saveBlob(fileHandle, vttBlob);
    836       }
    837
    838       showNotification(`✅ Archivos para "${file.name}" guardados en la carpeta: ${baseName}`, 'success');
    839
    840     } catch (error) {
    841       console.error('Error downloading organized files:', error);
    842       showNotification(`Error al descargar los archivos para "${file.name}". Inténtalo de nuevo.`, 'error');
    843     }
    844   };
    845
    846   const downloadFilesIndividually = async (file: UploadedFile, job: Job, format: 'txt' | 'pdf' | 'both') => {
    847     // Helper to trigger download
    848     const triggerDownload = (blob: Blob, filename: string) => {
    849       const url = URL.createObjectURL(blob);
    850       const a = document.createElement('a');
    851       a.href = url;
    852       a.download = filename;
    853       document.body.appendChild(a);
    854       a.click();
    855       document.body.removeChild(a);
    856       URL.revokeObjectURL(url);
    857     };
    858
    859     const baseName = file.name.replace(/\.[^/.]+$/, '');
    860
    861     // Download Transcription
    862     if (job.txt_url) {
    863       const res = await fetch(job.txt_url);
    864       const text = await res.text();
    865       if (format === 'pdf' || format === 'both') {
    866         const pdfBlob = await generatePdf('Transcripción', text, file.name);
    867         triggerDownload(pdfBlob, `${baseName}-transcripcion.pdf`);
    868       }
    869       if (format === 'txt' || format === 'both') {
    870         const txtBlob = new Blob([text], { type: 'text/plain' });
    871         triggerDownload(txtBlob, `${baseName}-transcripcion.txt`);
    872       }
    873     }
    874
    875     // Download Summary
    876     if (job.summary_url) {
    877       const res = await fetch(job.summary_url);
    878       const text = await res.text();
    879       if (format === 'pdf' || format === 'both') {
    880         const pdfBlob = await generatePdf('Resumen', text, file.name);
    881         triggerDownload(pdfBlob, `${baseName}-resumen.pdf`);
    882       }
    883       if (format === 'txt' || format === 'both') {
    884         const txtBlob = new Blob([text], { type: 'text/plain' });
    885         triggerDownload(txtBlob, `${baseName}-resumen.txt`);
    886       }
    887     }
    888
    889     // Download Speakers Report
    890     if (job.speakers_url) {
    891       const res = await fetch(job.speakers_url);
    892       const text = await res.text();
    893       if (format === 'pdf' || format === 'both') {
    894         const pdfBlob = await generatePdf('Análisis de Oradores', text, file.name);
    895         triggerDownload(pdfBlob, `${baseName}-oradores.pdf`);
    896       }
    897       if (format === 'txt' || format === 'both') {
    898         const txtBlob = new Blob([text], { type: 'text/plain' });
    899         triggerDownload(txtBlob, `${baseName}-oradores.txt`);
    900       }
    901     }
    902
    903     // Download Tags
    904     if (job.metadata?.tags && job.metadata.tags.length > 0) {
    905       const tagsText = `Tags para: ${file.name}\n\n- ${job.metadata.tags.join('\n- ')}`;
    906       if (format === 'pdf' || format === 'both') {
    907         const pdfBlob = await generatePdf('Tags', tagsText, file.name);
    908         triggerDownload(pdfBlob, `${baseName}-tags.pdf`);
    909       }
    910       if (format === 'txt' || format === 'both') {
    911         const txtBlob = new Blob([tagsText], { type: 'text/plain' });
    912         triggerDownload(txtBlob, `${baseName}-tags.txt`);
    913       }
    914     }
    915
    916     // Always download other formats as-is
    917     if (job.srt_url) window.open(job.srt_url, '_blank');
    918     if (job.vtt_url) window.open(job.vtt_url, '_blank');
    919   };
    920
    921   const getStatusText = (status: FileStatus) => {
    922     switch (status) {
    923       case 'uploading': return 'Subiendo';
    924       case 'pending': return 'Pendiente';
    925       case 'processing': return 'Procesando';
    926       case 'completed': return 'Completado';
    927       case 'error': return 'Error';
    928     }
    929   };
    930
    931   const getStatusColor = (status: FileStatus) => {
    932     switch (status) {
    933       case 'uploading': return darkMode ? 'text-blue-400' : 'text-blue-600';
    934       case 'pending': return darkMode ? 'text-amber-400' : 'text-amber-600';
    935       case 'processing': return darkMode ? 'text-purple-400' : 'text-purple-600';
    936       case 'completed': return darkMode ? 'text-green-400' : 'text-green-600';
    937       case 'error': return darkMode ? 'text-red-400' : 'text-red-600';
    938     }
    939   };
    940
    941   if (loading) {
    942     return (
    943       <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
    944         <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
    945       </div>
    946     );
    947   }
    948
    949   const selectedFiles = uploadedFiles.filter(file => selectedUploadedFileIds.has(file.id));
    950   const canTranscribe = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');
    951   const hasDocuments = selectedFiles.some(file => file.fileType === 'text');
    952   const hasAudioVideo = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');
    953
    954   const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
    955   const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
    956   const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
    957   const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
    958   const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
    959   const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';
    960
    961   return (
    962     <div className={`min-h-screen ${bgPrimary}`}>
    963       {/* Toast Notification - Positioned at top center */}
    964       {notification && (
    965         <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
    966           <div className={`px-4 py-3 rounded-lg shadow-lg ${
    967             notification.type === 'success' ? 'bg-green-500 text-white' :
    968             notification.type === 'error' ? 'bg-red-500 text-white' :
    969             'bg-blue-500 text-white'
    970           } max-w-md`}>
    971             <p className="text-sm font-medium">{notification.message}</p>
    972           </div>
    973         </div>
    974       )}
    975
    976       <div className="fixed top-6 right-6 z-40 flex items-center gap-2">
    977         <button
    978           onClick={() => router.push('/guia')}
    979           className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
    980           title="Guía de usuario"
    981         >
    982           <BookOpen className={`h-4 w-4 ${textSecondary}`} />
    983         </button>
    984         <button
    985           onClick={() => setDarkMode(!darkMode)}
    986           className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
    987           title="Cambiar tema"
    988         >
    989           {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
    990         </button>
    991         <button
    992           onClick={() => router.push('/pricing')}
    993           className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
    994           title="Ver planes y precios"
    995         >
    996           <span className="text-lg">💳</span>
    997         </button>
    998         <button
    999           onClick={() => router.push('/settings')}
   1000           className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
   1001           title="Ajustes"
   1002         >
   1003           <span className="text-lg">⚙️</span>
   1004         </button>
   1005         <button
   1006           onClick={handleLogout}
   1007           className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
   1008           title="Cerrar sesión"
   1009         >
   1010           <LogOut className={`h-4 w-4 ${textSecondary}`} />
   1011         </button>
   1012       </div>
   1013
   1014       <div className="flex pt-10" style={{ height: '100vh' }}>
   1015         <div className={`${bgSecondary} ${border} border-r p-6 flex flex-col`} style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
   1016
   1017           <div className="flex flex-col mb-6">
   1018             <div className="flex items-baseline gap-x-3">
   1019               <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
   1020               <span className={textSecondary}>trabajando para</span>
   1021             </div>
   1022             {(user?.name || user?.email) && (
   1023               <p className={`${textPrimary} text-xl font-semibold -mt-1 ml-1`}>{user.name || user.email}</p>
   1024             )}
   1025           </div>
   1026
   1027           <div className="mb-6">
   1028             <div
   1029               className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:border-orange-400
        transition-colors`}
   1030               onDrop={handleDrop}
   1031               onDragOver={handleDragOver}
   1032             >
   1033               <p className={`text-xs ${textSecondary} mb-3`}>
   1034                 Archivos admitidos: Audio, Video, TXT, DOCX, PDF.
   1035               </p>
   1036               <div className={`${textSecondary} mb-3`}>
   1037                 <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   1038                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
   1039                 </svg>
   1040               </div>
   1041               <p className={`text-xs ${textSecondary} mb-1`}>Arrastra y suelta hasta 50 archivos aquí</p>
   1042               <p className={`text-xs ${textSecondary} mb-2`}>o</p>
   1043               <label>
   1044                 <span className="text-orange-500 text-xs font-medium hover:text-orange-600 cursor-pointer">
   1045                   Selecciona archivos de tu equipo
   1046                 </span>
   1047                 <input
   1048                   type="file"
   1049                   multiple
   1050                   className="hidden"
   1051                   accept="audio/*,video/*,.txt,.docx,.pdf"
   1052                   onChange={handleFileChange}
   1053                 />
   1054               </label>
   1055             </div>
   1056
   1057             {error && (
   1058               <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
   1059                 <p className="text-xs text-red-700">{error}</p>
   1060               </div>
   1061             )}
   1062           </div>
   1063
   1064           <div className="mb-6">
   1065             <div className="flex items-center gap-2 mb-3">
   1066               <span className="text-orange-500 text-sm">🤖</span>
   1067               <h2 className={`text-sm font-medium ${textPrimary}`}>Acciones IA</h2>
   1068             </div>
   1069             <p className={`text-xs ${textSecondary} mb-3`}>Selecciona archivos y aplica acciones.</p>
   1070
   1071             <div className="space-y-2">
   1072               {/* Fila 1: Transcribir + Oradores */}
   1073               <div className="grid grid-cols-2 gap-2">
   1074                 <button
   1075                   onClick={() => !hasDocuments && handleApplyAction('Transcribir')}
   1076                   className={`p-2 ${canTranscribe && !hasDocuments ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs
        font-medium transition-colors`}
   1077                   disabled={!canTranscribe || hasDocuments}
   1078                   title={hasDocuments ? 'No disponible para documentos' : 'Transcribir audio/video a texto'}
   1079                 >
   1080                   📝 Transcribir
   1081                 </button>
   1082                 <button
   1083                   onClick={() => !hasDocuments && handleApplyAction('Oradores')}
   1084                   className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium
        transition-colors`}
   1085                   disabled={hasDocuments}
   1086                   title={hasDocuments ? 'No disponible para documentos' : 'Identificar y analizar hablantes'}
   1087                 >
   1088                   🎙️Oradores
   1089                 </button>
   1090               </div>
   1091
   1092               {/* Fila 2: Resumen + opciones Corto/Detallado */}
   1093               <div className="grid grid-cols-2 gap-2">
   1094                 <button
   1095                   onClick={() => handleApplyAction('Resumir')}
   1096                   className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
   1097                   title="Generar resumen del contenido"
   1098                 >
   1099                   📋 Resumen
   1100                 </button>
   1101                 <div className="flex items-center justify-around gap-1 text-xs">
   1102                   <label className="flex items-center gap-1">
   1103                     <input
   1104                       type="radio"
   1105                       className="accent-orange-500 scale-75"
   1106                       name="summary"
   1107                       checked={summaryType === 'short'}
   1108                       onChange={() => setSummaryType('short')}
   1109                     />
   1110                     <span className={textSecondary}>Corto</span>
   1111                   </label>
   1112                   <label className="flex items-center gap-1">
   1113                     <input
   1114                       type="radio"
   1115                       className="accent-orange-500 scale-75"
   1116                       name="summary"
   1117                       checked={summaryType === 'detailed'}
   1118                       onChange={() => setSummaryType('detailed')}
   1119                     />
   1120                     <span className={textSecondary}>Detallado</span>
   1121                   </label>
   1122                 </div>
   1123               </div>
   1124
   1125               {/* Fila 3: Subtítulos + opciones SRT/VTT */}
   1126               <div className="grid grid-cols-2 gap-2">
   1127                 <button
   1128                   onClick={() => !hasDocuments && handleApplyAction('Subtítulos')}
   1129                   className={`p-2 ${hasDocuments ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg text-xs font-medium
        transition-colors`}
   1130                   disabled={hasDocuments}
   1131                   title={hasDocuments ? 'No disponible para documentos' : 'Generar archivos de subtítulos'}
   1132                 >
   1133                   📄 Subtítulos
   1134                 </button>
   1135                 <div className="flex items-center justify-around gap-1 text-xs">
   1136                   <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
   1137                     <input
   1138                       type="checkbox"
   1139                       className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500"
   1140                       onChange={(e) => {
   1141                         if (e.target.checked && !hasDocuments) handleApplyAction('SRT');
   1142                       }}
   1143                       disabled={hasDocuments}
   1144                       title={hasDocuments ? 'No disponible para documentos' : 'Formato SRT'}
   1145                     />
   1146                     <span className={textSecondary}>SRT</span>
   1147                   </label>
   1148                   <label className={`flex items-center gap-1 ${hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
   1149                     <input
   1150                       type="checkbox"
   1151                       className="form-checkbox h-3 w-3 text-orange-500 rounded accent-orange-500"
   1152                       onChange={(e) => {
   1153                         if (e.target.checked && !hasDocuments) handleApplyAction('VTT');
   1154                       }}
   1155                       disabled={hasDocuments}
   1156                       title={hasDocuments ? 'No disponible para documentos' : 'Formato VTT'}
   1157                     />
   1158                     <span className={textSecondary}>VTT</span>
   1159                   </label>
   1160                 </div>
   1161               </div>
   1162
   1163               {/* Fila 4: Etiquetas + Archivos Procesados */}
   1164               <div className="grid grid-cols-2 gap-2">
   1165                 <button
   1166                   onClick={() => handleApplyAction('Etiquetas')}
   1167                   className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
   1168                   title="Generar etiquetas temáticas"
   1169                 >
   1170                   🏷️Etiquetas
   1171                 </button>
   1172                 <Link
   1173                   href="/processed-files"
   1174                   className="flex items-center justify-center p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
   1175                   title="Ver todos los archivos procesados"
   1176                 >
   1177                   ✅ Archivos Procesados
   1178                 </Link>
   1179               </div>
   1180
   1181               {/* Fila 5: Procesar Archivos - ancho completo */}
   1182               <button
   1183                 onClick={handleProcessSelectedFiles}
   1184                 className="w-full p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors mt-2"
   1185               >
   1186                 🚀 Procesar Archivos
   1187               </button>
   1188             </div>
   1189           </div>
   1190
   1191           <div className="mt-auto pt-6 border-t border-zinc-800">
   1192             <p className={`text-xs ${textSecondary} text-center mb-1`}>
   1193               © 2025 Annalogica. Todos los derechos reservados.
   1194             </p>
   1195             <div className="flex justify-center gap-3 text-xs mb-2">
   1196               <a href="/privacy" className={`${textSecondary} hover:text-orange-500`}>Privacidad</a>
   1197               <a href="/terms" className={`${textSecondary} hover:text-orange-500`}>Términos</a>
   1198               <a href="mailto:legal@annalogica.eu" className={`${textSecondary} hover:text-orange-500`}>Contacto</a>
   1199             </div>
   1200             <p className={`text-xs ${textSecondary} text-center`}>
   1201               support@annalogica.eu
   1202             </p>
   1203           </div>
   1204         </div>
   1205
   1206         <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
   1207           <div className="mb-6 flex justify-start">
   1208             <label htmlFor="language-select" className="sr-only">Idioma del Contenido</label>
   1209             <select
   1210                 id="language-select"
   1211                 className={`p-2 ${bgSecondary} rounded-lg shadow-sm ${border} border ${textPrimary} text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
   1212                 value={language}
   1213                 onChange={(e) => setLanguage(e.target.value)}
   1214                 style={{ minWidth: '180px' }}
   1215                 title="Selecciona el idioma del audio/video"
   1216             >
   1217                 <option value="auto">Detección automática</option>
   1218                 <option value="es">Español</option>
   1219                 <option value="ca">Català</option>
   1220                 <option value="eu">Euskera</option>
   1221                 <option value="gl">Gallego</option>
   1222                 <option value="pt">Português</option>
   1223                 <option value="en">English</option>
   1224                 <option value="fr">Français</option>
   1225                 <option value="de">Deutsch</option>
   1226                 <option value="it">Italiano</option>
   1227             </select>
   1228         </div>
   1229
   1230           <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden mb-6`} style={{ flex: '1 1 60%', minHeight: '400px' }}>
   1231             <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
   1232               <div>
   1233                 <div className="flex items-center gap-2 mb-2">
   1234                   <input
   1235                     type="checkbox"
   1236                     checked={selectedUploadedFileIds.size === uploadedFiles.filter(f => f.status !== 'completed').length && uploadedFiles.filter(f => f.status !== 'completed'
        ).length > 0}
   1237                     onChange={handleSelectAllUploaded}
   1238                     className="form-checkbox h-4 w-4 text-orange-500 rounded"
   1239                   />
   1240                   <span className="text-orange-500 text-sm">📁</span>
   1241                   <h2 className={`text-sm font-medium ${textPrimary}`}>Archivos Cargados</h2>
   1242                 </div>
   1243                 <p className={`text-xs ${textSecondary}`}>Archivos en proceso de subida y procesamiento</p>
   1244               </div>
   1245               <div className="flex gap-2">
   1246                 <button
   1247                   onClick={() => {
   1248                     const selectedFiles = uploadedFiles.filter(f => selectedUploadedFileIds.has(f.id) && f.status !== 'completed');
   1249                     if (selectedFiles.length === 0) {
   1250                       showNotification('Selecciona archivos para reiniciar su procesamiento', 'info');
   1251                       return;
   1252                     }
   1253                     if (confirm(`¿Reiniciar el procesamiento de ${selectedFiles.length} archivo(s)?`)) {
   1254                       setUploadedFiles(prev => prev.map(f => {
   1255                         if (selectedUploadedFileIds.has(f.id) && f.status !== 'completed') {
   1256                           return {
   1257                             ...f,
   1258                             status: 'pending' as FileStatus,
   1259                             processingProgress: 0,
   1260                             uploadProgress: 100,
   1261                             processingStartTime: undefined,
   1262                             estimatedTimeRemaining: undefined,
   1263                             actions: []
   1264                           };
   1265                         }
   1266                         return f;
   1267                       }));
   1268                       setSelectedUploadedFileIds(new Set());
   1269                       showNotification('Archivos reiniciados. Selecciona acciones y procesa.', 'success');
   1270                     }
   1271                   }}
   1272                   className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
   1273                   title="Reiniciar procesamiento de archivos seleccionados"
   1274                 >
   1275                   <RefreshCw className="h-3.5 w-3.5" />
   1276                   Reiniciar
   1277                 </button>
   1278                 <button
   1279                   onClick={async () => {
   1280                     const selectedFiles = uploadedFiles.filter(f => selectedUploadedFileIds.has(f.id));
   1281
   1282                     if (selectedFiles.length === 0) {
   1283                       showNotification('Selecciona archivos para eliminar', 'info');
   1284                       return;
   1285                     }
   1286
   1287                     if (!confirm(`¿Eliminar ${selectedFiles.length} archivo(s) seleccionado(s)?`)) {
   1288                       return;
   1289                     }
   1290
   1291                     // Separate completed from non-completed files
   1292                     const completedFiles = selectedFiles.filter(f => f.status === 'completed' && f.jobId);
   1293                     const nonCompletedFiles = selectedFiles.filter(f => f.status !== 'completed');
   1294
   1295                     // Delete completed files from database
   1296                     for (const file of completedFiles) {
   1297                       try {
   1298                         await fetch(`/api/processed-files/${file.jobId}`, {
   1299                           method: 'DELETE',
   1300                           credentials: 'include'
   1301                         });
   1302                       } catch (err) {
   1303                         console.error(`Error deleting ${file.name}:`, err);
   1304                       }
   1305                     }
   1306
   1307                     // Remove all selected files from state
   1308                     setUploadedFiles(prev => prev.filter(f => !selectedUploadedFileIds.has(f.id)));
   1309                     setSelectedUploadedFileIds(new Set());
   1310
   1311                     const total = completedFiles.length + nonCompletedFiles.length;
   1312                     showNotification(`${total} archivo(s) eliminado(s) correctamente`, 'success');
   1313                   }}
   1314                   className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
   1315                   title="Eliminar archivos seleccionados"
   1316                 >
   1317                   <Trash2 className="h-3.5 w-3.5" />
   1318                   Eliminar
   1319                 </button>
   1320               </div>
   1321             </div>
   1322
   1323             <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 200px)' }}>
   1324               {uploadedFiles.filter(f => f.status !== 'completed').length === 0 ? (
   1325                 <div className="px-4 py-8 text-center">
   1326                   <p className={`text-xs ${textSecondary}`}>No hay archivos cargados aún.</p>
   1327                 </div>
   1328               ) : (
   1329                 uploadedFiles.filter(f => f.status !== 'completed').map((file) => (
   1330                   <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
   1331                     <div className="flex items-center gap-4 mb-2">
   1332                       <input
   1333                         type="checkbox"
   1334                         checked={selectedUploadedFileIds.has(file.id)}
   1335                         onChange={() => handleFileSelect(file.id, 'uploaded')}
   1336                         className="form-checkbox h-4 w-4 text-orange-500 rounded"
   1337                       />
   1338                       <span className={`text-xs ${textPrimary} flex-1 truncate`}>{file.name}</span>
   1339                       {file.actions.length > 0 && (
   1340                         <div className="flex flex-wrap gap-1 ml-auto">
   1341                           {file.actions.map(action => (
   1342                             <span key={action} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
   1343                               {action}
   1344                             </span>
   1345                           ))}
   1346                         </div>
   1347                       )}
   1348                       <span className={`text-xs font-medium ${getStatusColor(file.status)}`} style={{ minWidth: '100px' }}>
   1349                         {getStatusText(file.status)}
   1350                       </span>
   1351                       <div className="flex items-center gap-2" style={{ minWidth: '80px' }}>
   1352                         <button
   1353                           onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
   1354                           className={`p-1 ${hover} rounded`}
   1355                           title="Eliminar"
   1356                         >
   1357                           <Trash2 className={`h-3 w-3 ${textSecondary}`} />
   1358                         </button>
   1359                       </div>
   1360                     </div>
   1361
   1362                     <div className="ml-6 space-y-1">
   1363                       {file.status === 'uploading' && (
   1364                         <div>
   1365                           <div className="flex justify-between items-center mb-1">
   1366                             <span className={`text-xs ${textSecondary}`}>Subida</span>
   1367                             <div className="flex items-center gap-2">
   1368                               <span className="relative flex h-2 w-2">
   1369                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
   1370                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
   1371                               </span>
   1372                               <span className="text-xs text-blue-500">{file.uploadProgress.toFixed(0)}%</span>
   1373                             </div>
   1374                           </div>
   1375                           <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
   1376                             <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${file.uploadProgress}%` }} />
   1377                           </div>
   1378                         </div>
   1379                       )}
   1380                       {file.status === 'processing' && (
   1381                         <div>
   1382                           <div className="flex justify-between items-center mb-1">
   1383                             <div className="flex items-center gap-1.5">
   1384                               <span className={`text-xs ${textSecondary}`}>
   1385                                 {(file.processingProgress || 0) >= 98 ? '🟡 Finalizando...' : 'Procesando'}
   1386                               </span>
   1387                               {(file.processingProgress || 0) >= 98 && (
   1388                                 <span className={`text-xs ${textSecondary} italic`}>(Generando resumen)</span>
   1389                               )}
   1390                             </div>
   1391                             <div className="flex items-center gap-2">
   1392                               {(file.processingProgress || 0) >= 90 ? (
   1393                                 <span className="relative flex h-2 w-2" title="Finalizando - Generando resumen y oradores">
   1394                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
   1395                                   <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
   1396                                 </span>
   1397                               ) : (
   1398                                 <span className="relative flex h-2 w-2" title="Procesando - Transcribiendo audio">
   1399                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
   1400                                   <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
   1401                                 </span>
   1402                               )}
   1403                               <span className="text-xs text-purple-500">{file.processingProgress || 0}%</span>
   1404                             </div>
   1405                           </div>
   1406
   1407                           {/* Timer, file size, and estimated time info */}
   1408                           <div className="flex justify-between items-center mb-1">
   1409                             <div className="flex items-center gap-3">
   1410                               <span className={`text-xs ${textSecondary}`} title="Tiempo transcurrido">
   1411                                 ⏱️ formatElapsedTime(file.processingStartTime)}
   1412                               </span>
   1413                               <span className={`text-xs ${textSecondary}`} title="Tamaño del archivo">
   1414                                 📦 {formatFileSize(file.fileSize)}
   1415                               </span>
   1416                             </div>
   1417                             {file.estimatedTimeRemaining !== undefined && file.estimatedTimeRemaining > 0 && (
   1418                               <span className={`text-xs ${textSecondary}`} title="Tiempo estimado restante">
   1419                                 ⏳ ~{formatTimeRemaining(file.estimatedTimeRemaining)}
   1420                               </span>
   1421                             )}
   1422                           </div>
   1423
   1424                           <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
   1425                             <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${file.processingProgress || 0}%` }} />
   1426                           </div>
   1427                         </div>
   1428                       )}
   1429                     </div>
   1430                   </div>
   1431                 ))
   1432               )}
   1433             </div>
   1434           </div>
   1435
   1436           <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden`} style={{ flex: '1 1 40%', minHeight: '300px' }}>
   1437             <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
   1438               <div className="flex-1">
   1439                 <div className="flex items-center gap-2 mb-2">
   1440                   <input
   1441                     type="checkbox"
   1442                     checked={selectedCompletedFileIds.size === uploadedFiles.filter(f => f.status === 'completed').length && uploadedFiles.filter(f => f.status ===
        'completed').length > 0}
   1443                     onChange={handleSelectAllCompleted}
   1444                     className="form-checkbox h-4 w-4 text-orange-500 rounded"
   1445                   />
   1446                   <span className="text-green-500 text-sm">✅</span>
   1447                   <h2 className={`text-sm font-medium ${textPrimary}`}>Todos los Archivos Completados</h2>
   1448                 </div>
   1449
   1450
   1451                 <div className="flex items-center gap-2 mt-2">
   1452                   <span className={`text-xs ${textSecondary}`}>Formato:</span>
   1453                   <label className="flex items-center gap-1">
   1454                     <input
   1455                       type="radio"
   1456                       className="accent-orange-500 scale-75"
   1457                       name="downloadFormat"
   1458                       checked={downloadFormat === 'pdf'}
   1459                       onChange={() => setDownloadFormat('pdf')}
   1460                     />
   1461                     <span className={`text-xs ${textSecondary}`}>PDF</span>
   1462                   </label>
   1463                   <label className="flex items-center gap-1">
   1464                     <input
   1465                       type="radio"
   1466                       className="accent-orange-500 scale-75"
   1467                       name="downloadFormat"
   1468                       checked={downloadFormat === 'txt'}
   1469                       onChange={() => setDownloadFormat('txt')}
   1470                     />
   1471                     <span className={`text-xs ${textSecondary}`}>TXT</span>
   1472                   </label>
   1473                   <label className="flex items-center gap-1">
   1474                     <input
   1475                       type="radio"
   1476                       className="accent-orange-500 scale-75"
   1477                       name="downloadFormat"
   1478                       checked={downloadFormat === 'both'}
   1479                       onChange={() => setDownloadFormat('both')}
   1480                     />
   1481                     <span className={`text-xs ${textSecondary}`}>Ambos</span>
   1482                   </label>
   1483                 </div>
   1484
   1485
   1486               </div>
   1487               <div className="flex gap-2">
   1488                 <button
   1489                   onClick={async () => {
   1490                     const completedFiles = uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id));
   1491                     if (completedFiles.length === 0) {
   1492                       showNotification('Selecciona al menos un archivo completado para descargar.', 'info');
   1493                       return;
   1494                     }
   1495
   1496                     if (!downloadDirHandle && 'showDirectoryPicker' in window) {
   1497                       showNotification('Por favor, elige una carpeta de destino primero usando el botón "📁 Carpeta Descarga".', 'info');
   1498                       return;
   1499                     }
   1500
   1501                     for (const file of completedFiles) {
   1502                       if (file.jobId) {
   1503                         try {
   1504                           const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
   1505                           if (res.ok) {
   1506                             const data = await res.json();
   1507                             const job = data.job;
   1508                             if (downloadDirHandle) {
   1509                               await downloadFilesOrganized(file, job, downloadDirHandle, downloadFormat);
   1510                             } else {
   1511                               await downloadFilesIndividually(file, job, downloadFormat);
   1512                             }
   1513                           }
   1514                         } catch (err) {
   1515                           console.error('Error downloading files:', err);
   1516                           showNotification(`Error al descargar ${file.name}.`, 'error');
   1517                         }
   1518                       }
   1519                     }
   1520                   }}
   1521                   disabled={uploadedFiles.filter(f => f.status === 'completed' && selectedCompletedFileIds.has(f.id)).length === 0}
   1522                   className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-xs font-medium
        transition-colors"
   1523                 >
   1524                   📥 Descargar Seleccionados
   1525                 </button>
   1526                 <button
   1527                   onClick={async () => {
   1528                     if (!('showDirectoryPicker' in window)) {
   1529                       showNotification('Tu navegador no soporta la selección de carpetas. Las descargas se realizarán individualmente.', 'info');
   1530                       return;
   1531                     }
   1532                     try {
   1533                       const handle = await (window as any).showDirectoryPicker();
   1534                       setDownloadDirHandle(handle);
   1535                       showNotification(`Carpeta de descarga seleccionada: "${handle.name}". Las próximas descargas se guardarán aquí.`, 'success');
   1536                     } catch (err) {
   1537                       console.error('Error al seleccionar la carpeta:', err);
   1538                     }
   1539                   }}
   1540                   className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
   1541                   title="Elegir carpeta de descarga"
   1542                 >
   1543                   📁 Carpeta Descarga
   1544                 </button>
   1545                 <button
   1546                   onClick={handleDeleteSelectedCompletedFiles}
   1547                   className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
   1548                   title="Eliminar archivos procesados seleccionados"
   1549                 >
   1550                   <Trash2 className="h-3.5 w-3.5" />
   1551                   Eliminar
   1552                 </button>
   1553               </div>
   1554             </div>
   1555
   1556             <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 200px)' }}>
   1557               {uploadedFiles.filter(f => f.status === 'completed').length === 0 ? (
   1558                 <div className="px-4 py-8 text-center">
   1559                   <p className={`text-xs ${textSecondary}`}>No hay archivos completados aún.</p>
   1560                 </div>
   1561               ) : (
   1562                 uploadedFiles.filter(f => f.status === 'completed').map((file) => (
   1563                   <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
   1564                     <div className="flex items-center gap-4">
   1565                       <input
   1566                         type="checkbox"
   1567                         checked={selectedCompletedFileIds.has(file.id)}
   1568                         onChange={() => handleFileSelect(file.id, 'completed')}
   1569                         className="form-checkbox h-4 w-4 text-orange-500 rounded"
   1570                       />
   1571                       <span className={`text-xs ${textPrimary} flex-1 truncate`}>{file.name}</span>
   1572                       <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
   1573                         ✓ Completado
   1574                       </span>
   1575                       <button
   1576                         onClick={async () => {
   1577                           if (!file.jobId) return;
   1578
   1579                           if (!downloadDirHandle && 'showDirectoryPicker' in window) {
   1580                             showNotification('Por favor, elige una carpeta de destino primero usando el botón "📁 Carpeta Descarga".', 'info');
   1581                             return;
   1582                           }
   1583
   1584                           try {
   1585                             const res = await fetch(`/api/jobs/${file.jobId}`, { credentials: 'include' });
   1586                             if (res.ok) {
   1587                               const data = await res.json();
   1588                               const job = data.job;
   1589                               if (downloadDirHandle) {
   1590                                 await downloadFilesOrganized(file, job, downloadDirHandle, downloadFormat);
   1591                               } else {
   1592                                 await downloadFilesIndividually(file, job, downloadFormat);
   1593                               }
   1594                             }
   1595                           } catch (err) {
   1596                             console.error('Error downloading file:', err);
   1597                             showNotification(`Error al descargar ${file.name}.`, 'error');
   1598                           }
   1599                         }}
   1600                         className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
   1601                       >
   1602                         📥 Descargar
   1603                       </button>
   1604                     </div>
   1605                   </div>
   1606                 ))
   1607               )}
   1608             </div>
   1609           </div>
   1610
   1611         </div>
   1612       </div>
   1613     </div>
   1614   );
   1615 }
