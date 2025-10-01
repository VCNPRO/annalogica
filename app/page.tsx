'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Settings, LogOut, FileText, BarChart3, Clock, Database } from 'lucide-react';
import Link from 'next/link';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [options, setOptions] = useState({
    transcription: true,
    summary: true,
    summaryType: 'detailed' as 'short' | 'detailed',
    tags: true,
    speakers: true,
    srt: true
  });

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: file.name })
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || 'Error al obtener URL de subida');
      }

      const { uploadUrl, fields } = await uploadResponse.json();

      const formData = new FormData();
      Object.keys(fields).forEach(key => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Error en la transferencia del archivo'));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Error de conexión')));
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">anna logica</h1>
              <nav className="hidden md:flex gap-6">
                <Link href="/" className="text-sm font-medium text-gray-900 border-b-2 border-blue-600 pb-4">
                  Dashboard
                </Link>
                <Link href="/results" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-4">
                  Archivos
                </Link>
                <Link href="/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-4">
                  Configuración
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500">Plan {user.plan || 'Free'}</p>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <LogOut className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Archivos Procesados</p>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.filesProcessed || 0}</p>
            <p className="text-xs text-gray-500 mt-1">de {user.monthlyLimit || 10} este mes</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">En Proceso</p>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">archivos en cola</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Almacenamiento</p>
              <Database className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">0 GB</p>
            <p className="text-xs text-gray-500 mt-1">de 10 GB disponibles</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Estado</p>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <p className="text-xl font-semibold text-gray-900">Operativo</p>
            <p className="text-xs text-gray-500 mt-1">Todos los servicios activos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Carga de Archivos</h2>
                <p className="text-sm text-gray-600 mt-1">Formatos soportados: MP3, MP4, WAV, M4A, PDF, TXT</p>
              </div>
              
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-blue-600 font-semibold hover:text-blue-700">
                      Seleccionar archivo
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".mp3,.mp4,.wav,.m4a,.mov,.avi,.webm,.mkv,.flac,.ogg,.txt,.pdf"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">o arrastra y suelta aquí</p>
                  <p className="text-xs text-gray-400 mt-4">Tamaño máximo: 500 MB por archivo</p>
                </div>

                {uploading && (
                  <div className="mt-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Procesando archivo...</span>
                      <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800">Archivo subido correctamente</p>
                    <p className="text-xs text-green-600 mt-1">El procesamiento comenzará en breve</p>
                  </div>
                )}

                {error && (
                  <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Archivos Recientes</h2>
              </div>
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm">No hay archivos procesados</p>
                  <Link href="/results" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                    Ver todos los archivos
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Opciones de Procesamiento</h3>
              </div>
              <div className="p-6 space-y-4">
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.transcription}
                    onChange={(e) => setOptions({...options, transcription: e.target.checked})}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Transcripción</p>
                    <p className="text-xs text-gray-500">Conversión de audio a texto</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.summary}
                    onChange={(e) => setOptions({...options, summary: e.target.checked})}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Resumen</p>
                    <p className="text-xs text-gray-500 mb-2">Generación automática de resumen</p>
                    {options.summary && (
                      <div className="ml-0 space-y-1 border-l-2 border-gray-200 pl-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={options.summaryType === 'short'}
                            onChange={() => setOptions({...options, summaryType: 'short'})}
                            className="w-3 h-3 text-blue-600"
                          />
                          <span className="text-xs text-gray-700">Resumen breve</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={options.summaryType === 'detailed'}
                            onChange={() => setOptions({...options, summaryType: 'detailed'})}
                            className="w-3 h-3 text-blue-600"
                          />
                          <span className="text-xs text-gray-700">Resumen detallado</span>
                        </label>
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.tags}
                    onChange={(e) => setOptions({...options, tags: e.target.checked})}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Etiquetas</p>
                    <p className="text-xs text-gray-500">Identificación de palabras clave</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.speakers}
                    onChange={(e) => setOptions({...options, speakers: e.target.checked})}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Intervinientes</p>
                    <p className="text-xs text-gray-500">Identificación de personas</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.srt}
                    onChange={(e) => setOptions({...options, srt: e.target.checked})}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Subtítulos (SRT)</p>
                    <p className="text-xs text-gray-500">Formato de subtítulos temporizado</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Información de Cuenta</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan actual:</span>
                  <span className="font-medium text-gray-900">{user.plan || 'Free'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Archivos usados:</span>
                  <span className="font-medium text-gray-900">{user.filesProcessed || 0} / {user.monthlyLimit || 10}</span>
                </div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${((user.filesProcessed || 0) / (user.monthlyLimit || 10)) * 100}%` }}
                />
              </div>
              <Link href="/pricing" className="mt-4 block text-center text-sm text-blue-600 hover:underline font-medium">
                Actualizar plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
