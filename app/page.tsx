'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Trash2, Sun, Moon, HelpCircle, LogOut } from 'lucide-react';

// AssemblyAI + Inngest - Arquitectura asíncrona con polling

type FileStatus = 'uploading' | 'pending' | 'error'; // Simplified statuses for this page

interface UploadedFile {
  id: string;
  name: string;
  uploadProgress: number;
  status: FileStatus;
  date: string;
  fileType: 'audio' | 'video' | 'text'; // New: Store file type
  actions: string[]; // New: Store selected actions for the file
  jobId?: string; // Add jobId to link to details page
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Keep this state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  const getFileType = (mimeType: string): 'audio' | 'video' | 'text' => {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('text/') || mimeType === 'application/pdf' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'text';
    return 'text'; // Default to text if unknown, or handle as error
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sesión expirada');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const fileId = Date.now().toString() + i; // Unique ID for each file
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          uploadProgress: 0,
          status: 'uploading',
          date: new Date().toISOString(),
          fileType: getFileType(file.type), // Determine file type
          actions: [] // Initialize actions as empty
        };
        setUploadedFiles(prev => [...prev, newFile]);

        // Upload directo a Blob (bypass function size limit)
        const { upload } = await import('@vercel/blob/client');

        // Generate unique filename to avoid conflicts
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const uniqueFilename = `${timestamp}-${randomSuffix}-${file.name}`;

        const blob = await upload(uniqueFilename, file, {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
          clientPayload: JSON.stringify({
            size: file.size,
            type: file.type,
            token: token, // Pass token in payload
          }),
          onUploadProgress: ({ percentage }) => {
            setUploadedFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, uploadProgress: percentage } : f
            ));
          },
        });

        const blobUrl = blob.url;

        // Actualizar progreso de upload
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, uploadProgress: 100 } : f
        ));

        // Iniciar procesamiento asíncrono con AssemblyAI (solo crear el job)
        const filename = file.name;
        const processRes = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ audioUrl: blobUrl, filename })
        });

        if (!processRes.ok) {
          const text = await processRes.text();
          let errorMessage = 'Error al procesar';
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const { jobId } = await processRes.json();
        console.log('[Upload] Job created:', jobId);

        // Update status to pending and add jobId
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'pending', jobId: jobId } : f
        ));
      }
      
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

  const handleFileSelect = (fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === uploadedFiles.length) {
      setSelectedFileIds(new Set()); // Deselect all
    } else {
      setSelectedFileIds(new Set(uploadedFiles.map(file => file.id))); // Select all
    }
  };

  const handleApplyAction = (actionName: string) => {
    setUploadedFiles(prevFiles =>
      prevFiles.map(file =>
        selectedFileIds.has(file.id)
          ? {
              ...file,
              actions: file.actions.includes(actionName)
                ? file.actions.filter(a => a !== actionName) // Deselect if already selected
                : [...file.actions, actionName], // Select if not selected
            }
          : file
      )
    );
  };

  const handleProcessSelectedFiles = () => {
    if (selectedFileIds.size === 0) {
      alert('Por favor, selecciona al menos un archivo para procesar.');
      return;
    }
    const filesToProcess = uploadedFiles.filter(file => selectedFileIds.has(file.id));
    console.log('Archivos a procesar:', filesToProcess);
    alert('Iniciando procesamiento de archivos seleccionados. Revisa la consola para más detalles.');
    // Here you would typically make an API call to your backend
    // to start the actual processing based on filesToProcess and their actions.
  };



  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return 'Subiendo';
      case 'pending': return 'Pendiente';
      case 'error': return 'Error';
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return darkMode ? 'text-blue-400' : 'text-blue-600';
      case 'pending': return darkMode ? 'text-amber-400' : 'text-amber-600';
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

  const selectedFiles = uploadedFiles.filter(file => selectedFileIds.has(file.id));
  const canTranscribe = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Modo Producción - Usuario: {user?.email || 'Usuario'}
      </div>

      <div className="fixed top-16 right-6 z-40 flex items-center gap-2">
        <button 
          onClick={() => alert('Guía de usuario próximamente')} 
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Guía de usuario"
        >
          <HelpCircle className={`h-4 w-4 ${textSecondary}`} />
        </button>
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <button
          onClick={() => router.push('/settings')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Ajustes"
        >
          <span className={`text-sm ${textSecondary}`}>Ajustes</span>
          <span>⚙️</span>
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
          
          <div className="flex items-center mb-6">
                        <h1 className="font-orbitron text-[36px] text-orange-500">annalogica</h1>
          </div>

          <div className="mb-6">
            <div 
              className={`border-2 border-dashed ${darkMode ? 'border-zinc-700' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors`}
              onDrop={handleDrop} // Add drop handler
              onDragOver={handleDragOver} // Add drag over handler
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className={`text-sm font-medium ${textPrimary}`}>Carga de Archivos</h2>
              </div>
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
            <p className={`text-xs ${textSecondary} mb-3`}>Selecciona archivos y aplica una acción de IA.</p>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Idioma del Contenido</label>
                <select 
                  className={`w-full p-2 border ${border} ${bgSecondary} ${textPrimary} rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="auto">Detección automática</option>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ca">Català</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyAction('Transcribir')}
                  className={`p-2 ${canTranscribe ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs font-medium transition-colors`}
                  disabled={!canTranscribe}
                >
                  📝 Transcribir
                </button>
                <button
                  onClick={() => handleApplyAction('Procesar Archivos')}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  🚀 Procesar Archivos
                </button>
              </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleApplyAction('Resumir')}
                                className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                📋 Resumir
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyAction('Aplicar Tags')}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  🏷️ Aplicar Tags
                </button>
                <button
                  onClick={() => handleApplyAction('Traducir')}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  🌐 Traducir
                </button>
              </div>

                            <select
                              className={`w-full p-2 border ${border} ${bgSecondary} ${textPrimary} rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                              value={targetLanguage}
                              onChange={(e) => setTargetLanguage(e.target.value)}
                            >
                              <option value="en">Inglés</option>
                              <option value="es">Español</option>
                              <option value="fr">Français</option>
                              <option value="ca">Català</option>
                            </select>
                          </div>
                        </div>
              
                                  <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-zinc-500">
              annalogica by videoconversion digital lab, S.L.
            </p>
            <p className="text-xs text-zinc-500">
              From Barcelona with love
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
          <div className="mb-6" style={{ height: '28px' }}></div>
          
          <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden mb-6`} style={{ flex: '1 1 60%', minHeight: '400px' }}>
            <div className={`px-4 py-3 ${border} border-b flex items-center justify-between`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.size === uploadedFiles.length && uploadedFiles.length > 0}
                    onChange={handleSelectAll}
                    className="form-checkbox h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-orange-500 text-sm">📁</span>
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Archivos Cargados</h2>
                </div>
                <p className={`text-xs ${textSecondary}`}>Archivos en proceso de subida y procesamiento</p>
              </div>
              {/* Removed selectedUploadedFiles.length > 0 check for delete button */}
              <button 
                onClick={() => setUploadedFiles([])} 
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
              >
                Limpiar
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 200px)' }}>
              {uploadedFiles.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className={`text-xs ${textSecondary}`}>No hay archivos cargados aún.</p>
                </div>
              ) : (
                uploadedFiles.map((file) => (
                  <div key={file.id} className={`px-4 py-3 ${border} border-b ${hover}`}>
                    <div className="flex items-center gap-4 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={() => handleFileSelect(file.id)}
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
                        {file.status === 'pending' && file.jobId && (
                          <Link href={`/files/${file.jobId}`} className={`p-1 ${hover} rounded`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 ${textSecondary}`}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                          </Link>
                        )}
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
                          <div className="flex justify-between mb-1">
                            <span className={`text-xs ${textSecondary}`}>Subida</span>
                            <span className="text-xs text-blue-500">{file.uploadProgress.toFixed(0)}%</span>
                          </div>
                          <div className={`w-full ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-1`}>
                            <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${file.uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                      
                      {(file.status === 'pending' || file.status === 'error') && (
                        <div className="flex justify-between mb-1">
                          <span className={`text-xs ${textSecondary}`}>Estado</span>
                          <span className={`text-xs ${getStatusColor(file.status)}`}>{getStatusText(file.status)}</span>
                        </div>
                      )}
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