'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileAudio, FileVideo, FileText, Settings, LogOut, ChevronDown } from 'lucide-react';
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
        throw new Error('Sesión expirada');
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
        throw new Error(data.error || 'Error al obtener URL');
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
            reject(new Error('Error al subir'));
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-zinc-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">anna logica</h1>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm text-zinc-900 font-medium">Dashboard</Link>
              <Link href="/results" className="text-sm text-zinc-500 hover:text-zinc-900">Archivos</Link>
              <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-900">Configuración</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-zinc-900">{user.email}</p>
              <p className="text-xs text-zinc-500">Plan {user.plan || 'Free'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-zinc-100 rounded-md">
              <LogOut className="h-4 w-4 text-zinc-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Área de carga */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-zinc-100">
                <h2 className="text-base font-semibold text-zinc-900">Procesar Archivo</h2>
                <p className="text-sm text-zinc-500 mt-1">Sube audio, vídeo o documentos para transcribir y analizar</p>
              </div>
              
              <div className="p-8">
                <div className="border-2 border-dashed border-zinc-200 rounded-lg p-16 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                  <div className="flex justify-center gap-4 mb-6">
                    <FileAudio className="h-8 w-8 text-zinc-300" />
                    <FileVideo className="h-8 w-8 text-zinc-300" />
                    <FileText className="h-8 w-8 text-zinc-300" />
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-block px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition">
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
                  <p className="text-xs text-zinc-400 mt-4">o arrastra y suelta aquí · Máx. 500 MB</p>
                </div>

                {uploading && (
                  <div className="mt-8">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-medium text-zinc-900">Subiendo archivo</span>
                      <span className="text-sm text-zinc-500">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5">
                      <div className="bg-zinc-900 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900">Archivo subido correctamente</p>
                    <p className="text-xs text-green-700 mt-1">Procesamiento iniciado · Tiempo estimado: 2-4 minutos</p>
                  </div>
                )}

                {error && (
                  <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-900">Error</p>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Archivos procesados */}
            <div className="bg-white rounded-xl border border-zinc-200">
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Archivos Procesados</h2>
                  <p className="text-sm text-zinc-500 mt-1">{user.filesProcessed || 0} archivos este mes</p>
                </div>
                <Link href="/results" className="text-sm font-medium text-zinc-900 hover:text-zinc-600">
                  Ver todos →
                </Link>
              </div>
              <div className="p-8">
                <div className="text-center py-16 text-zinc-400">
                  <Upload className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-sm">Aún no has procesado ningún archivo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-8">
            
            {/* Opciones */}
            <div className="bg-white rounded-xl border border-zinc-200">
              <div className="px-6 py-5 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900">Opciones de Procesamiento</h3>
              </div>
              <div className="p-6 space-y-5">
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.transcription}
                    onChange={(e) => setOptions({...options, transcription: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-zinc-900 rounded border-zinc-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Transcripción completa</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Conversión de audio/vídeo a texto</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.summary}
                    onChange={(e) => setOptions({...options, summary: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-zinc-900 rounded border-zinc-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Resumen automático</p>
                    <p className="text-xs text-zinc-500 mt-0.5 mb-3">Síntesis del contenido generada por IA</p>
                    {options.summary && (
                      <div className="space-y-2 pl-1 border-l-2 border-zinc-200 ml-2">
                        <label className="flex items-center gap-2.5 cursor-pointer ml-3">
                          <input
                            type="radio"
                            checked={options.summaryType === 'short'}
                            onChange={() => setOptions({...options, summaryType: 'short'})}
                            className="w-3.5 h-3.5 text-zinc-900"
                          />
                          <span className="text-xs text-zinc-700">Resumen breve (2-3 párrafos)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer ml-3">
                          <input
                            type="radio"
                            checked={options.summaryType === 'detailed'}
                            onChange={() => setOptions({...options, summaryType: 'detailed'})}
                            className="w-3.5 h-3.5 text-zinc-900"
                          />
                          <span className="text-xs text-zinc-700">Resumen detallado (estructura completa)</span>
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
                    className="mt-0.5 w-4 h-4 text-zinc-900 rounded border-zinc-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Etiquetas y palabras clave</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Identificación automática de temas</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.speakers}
                    onChange={(e) => setOptions({...options, speakers: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-zinc-900 rounded border-zinc-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Identificación de intervinientes</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Detección de diferentes hablantes</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.srt}
                    onChange={(e) => setOptions({...options, srt: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-zinc-900 rounded border-zinc-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Archivo de subtítulos (SRT)</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Formato compatible con reproductores</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Info cuenta */}
            <div className="bg-zinc-900 rounded-xl text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Plan {user.plan || 'Free'}</h4>
                <Link href="/pricing" className="text-xs font-medium hover:underline">Actualizar</Link>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Archivos procesados</span>
                  <span className="text-white font-medium">{user.filesProcessed || 0} / {user.monthlyLimit || 10}</span>
                </div>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-4">
                <div 
                  className="bg-white h-1.5 rounded-full transition-all" 
                  style={{ width: `${((user.filesProcessed || 0) / (user.monthlyLimit || 10)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
