'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Trash2 } from 'lucide-react';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

type FileStatus = 'uploading' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  uploadProgress: number;
  processProgress: number;
  status: FileStatus;
  date: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [speakerHints, setSpeakerHints] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setLoading(false);
    loadProcessedFiles();
  }, [router]);

  const loadProcessedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessedFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileId = Date.now().toString();
    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      uploadProgress: 0,
      processProgress: 0,
      status: 'uploading',
      date: new Date().toISOString()
    };

    setUploadedFiles(prev => [...prev, newFile]);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sesión expirada');

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: file.name })
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al obtener URL');
      }

      const { uploadUrl, fields } = await uploadResponse.json();
      const formData = new FormData();
      Object.keys(fields).forEach(key => formData.append(key, fields[key]));
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, uploadProgress: progress } : f
          ));
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Error al subir'));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Error de conexión')));
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });

      // Cambiar a estado "processing"
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing', uploadProgress: 100 } : f
      ));

      // Simular progreso de procesamiento
      let processProgress = 0;
      const processInterval = setInterval(() => {
        processProgress += 10;
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, processProgress: Math.min(processProgress, 90) } : f
        ));
        
        if (processProgress >= 90) {
          clearInterval(processInterval);
        }
      }, 500);

      // Después de 3 minutos marcar como completado
      setTimeout(() => {
        clearInterval(processInterval);
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'completed', processProgress: 100 } : f
        ));
        loadProcessedFiles();
      }, 180000);

    } catch (err: any) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' } : f
      ));
      setError(err.message);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(uploadedFiles.map(f => f.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleReload = (fileId: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing', processProgress: 0 } : f
    ));
  };

  const handleDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return 'Subiendo';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      case 'error': return 'Error';
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'processing': return 'text-amber-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        🚀 Modo Producción - Usuario: {user?.email || 'Usuario'}
        <button onClick={handleLogout} className="ml-2 underline hover:no-underline">
          Cerrar sesión
        </button>
      </div>

      <div className="fixed top-16 right-6 z-40">
        <Link href="/settings" className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-600">Ajustes</span>
          <span>⚙️</span>
        </Link>
      </div>

      <div className="flex pt-10" style={{ height: '100vh' }}>
        <div className="bg-white border-r border-gray-200 p-6 flex flex-col" style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
          
          <div className="flex items-center mb-6">
            <h1 className="text-3xl text-orange-500 tracking-tight font-black">anna logica</h1>
          </div>

          <div className="mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className="text-sm font-medium text-gray-900">Carga de Archivos</h2>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Sube archivos de audio, vídeo o texto (archivos grandes soportados con subida fragmentada).
              </p>
              <div className="text-gray-400 mb-3">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 mb-1">Arrastra y suelta hasta 50 archivos aquí</p>
              <p className="text-xs text-gray-500 mb-2">o</p>
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
              <h2 className="text-sm font-medium text-gray-900">Acciones IA</h2>
            </div>
            <p className="text-xs text-gray-600 mb-3">Selecciona archivos y aplica una acción de IA.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Idioma del Contenido</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                <button className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                  📝 Transcribir
                </button>
                <button className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                  👥 Identificar Oradores
                </button>
              </div>

              <button className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                📋 Resumir y Etiquetar
              </button>

              <div className="flex items-center gap-3 text-xs mb-2">
                <label className="flex items-center gap-1">
                  <input 
                    type="radio" 
                    className="accent-orange-500 scale-75" 
                    name="summary"
                    checked={summaryType === 'short'}
                    onChange={() => setSummaryType('short')}
                  />
                  <span className="text-gray-700">Corto</span>
                </label>
                <label className="flex items-center gap-1">
                  <input 
                    type="radio" 
                    className="accent-orange-500 scale-75" 
                    name="summary"
                    checked={summaryType === 'detailed'}
                    onChange={() => setSummaryType('detailed')}
                  />
                  <span className="text-gray-700">Detallado</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Pistas de oradores (ej: Ana, Juan)"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
                value={speakerHints}
                onChange={(e) => setSpeakerHints(e.target.value)}
              />

              <button className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors mb-2">
                🌐 Traducir
              </button>

              <select 
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                <option value="en">Inglés</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ca">Català</option>
              </select>

              <button className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                📊 Analizar Fichero
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
          <div className="mb-6" style={{ height: '28px' }}></div>
          
          {/* Archivos Cargados */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6" style={{ flex: '1 1 60%', minHeight: '400px' }}>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className="text-sm font-medium text-gray-900">Archivos Cargados</h2>
              </div>
              <p className="text-xs text-gray-600">Archivos en proceso de subida y procesamiento</p>
            </div>

            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 scale-75"
                  checked={selectedFiles.length === uploadedFiles.length && uploadedFiles.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="text-xs font-medium text-gray-900 flex-1">Nombre Archivo</span>
                <span className="text-xs font-medium text-gray-600" style={{ minWidth: '100px' }}>Estado</span>
                <span className="text-xs font-medium text-gray-600" style={{ minWidth: '80px' }}>Acciones</span>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 200px)' }}>
              {uploadedFiles.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-500">No hay archivos cargados aún.</p>
                </div>
              ) : (
                uploadedFiles.map((file) => (
                  <div key={file.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center gap-4 mb-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 scale-75"
                        checked={selectedFiles.includes(file.id)}
                        onChange={(e) => handleSelectFile(file.id, e.target.checked)}
                      />
                      <span className="text-xs text-gray-900 flex-1 truncate">{file.name}</span>
                      <span className={`text-xs font-medium ${getStatusColor(file.status)}`} style={{ minWidth: '100px' }}>
                        {getStatusText(file.status)}
                      </span>
                      <div className="flex items-center gap-2" style={{ minWidth: '80px' }}>
                        <button 
                          onClick={() => handleReload(file.id)} 
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Recargar"
                        >
                          <RefreshCw className="h-3 w-3 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.id)} 
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Barras de progreso */}
                    <div className="ml-6 space-y-1">
                      {file.status === 'uploading' && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-500">Subida</span>
                            <span className="text-xs text-blue-600">{file.uploadProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${file.uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                      
                      {(file.status === 'processing' || file.status === 'completed') && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-500">Procesamiento</span>
                            <span className="text-xs text-amber-600">{file.processProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${file.processProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Archivos Procesados */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ flex: '1 1 40%', minHeight: '250px' }}>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-sm">✓</span>
                <h2 className="text-sm font-medium text-gray-900">Archivos Procesados</h2>
              </div>
              <p className="text-xs text-gray-600">Archivos completados y listos para descargar</p>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 150px)' }}>
              {processedFiles.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-500">No hay archivos procesados aún.</p>
                  <Link href="/results" className="text-xs text-orange-500 hover:underline mt-2 inline-block">
                    Ver historial completo →
                  </Link>
                </div>
              ) : (
                processedFiles.slice(0, 5).map((file, idx) => (
                  <div key={idx} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-900 truncate flex-1">{file.name}</span>
                      <Link href="/results" className="text-xs text-orange-500 hover:underline ml-4">
                        Descargar
                      </Link>
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
