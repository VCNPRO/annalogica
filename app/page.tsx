'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Settings, LogOut, FileText } from 'lucide-react';
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-orange-500">anna logica</h1>
          <div className="flex items-center gap-6">
            <Link href="/results" className="text-sm text-zinc-400 hover:text-white">Archivos</Link>
            <Link href="/settings" className="text-sm text-zinc-400 hover:text-white">Configuración</Link>
            <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-16">
        
        {/* Área de carga principal */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-2">Procesar archivos</h2>
          <p className="text-zinc-400 mb-8">Sube audio, vídeo o documentos para transcribir y analizar</p>
          
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-20 text-center hover:border-orange-500 transition-colors">
            <Upload className="mx-auto h-16 w-16 text-zinc-700 mb-6" />
            <label className="cursor-pointer">
              <span className="inline-block px-8 py-3 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400 transition">
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
            <p className="text-zinc-500 text-sm mt-4">o arrastra y suelta aquí</p>
          </div>

          {uploading && (
            <div className="mt-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm">Subiendo...</span>
                <span className="text-sm text-zinc-400">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {success && (
            <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-400">✓ Archivo subido correctamente</p>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Opciones de procesamiento */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-semibold mb-6">Opciones de procesamiento</h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.transcription}
                  onChange={(e) => setOptions({...options, transcription: e.target.checked})}
                  className="mt-1 w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-orange-500"
                />
                <div>
                  <p className="font-medium group-hover:text-orange-500">Transcripción</p>
                  <p className="text-sm text-zinc-500">Conversión de audio a texto</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.summary}
                  onChange={(e) => setOptions({...options, summary: e.target.checked})}
                  className="mt-1 w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-orange-500"
                />
                <div className="flex-1">
                  <p className="font-medium group-hover:text-orange-500">Resumen</p>
                  <p className="text-sm text-zinc-500 mb-3">Síntesis automática del contenido</p>
                  {options.summary && (
                    <div className="space-y-2 pl-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={options.summaryType === 'short'}
                          onChange={() => setOptions({...options, summaryType: 'short'})}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span className="text-sm text-zinc-400">Breve</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={options.summaryType === 'detailed'}
                          onChange={() => setOptions({...options, summaryType: 'detailed'})}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span className="text-sm text-zinc-400">Detallado</span>
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
                  className="mt-1 w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-orange-500"
                />
                <div>
                  <p className="font-medium group-hover:text-orange-500">Etiquetas</p>
                  <p className="text-sm text-zinc-500">Palabras clave automáticas</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.speakers}
                  onChange={(e) => setOptions({...options, speakers: e.target.checked})}
                  className="mt-1 w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-orange-500"
                />
                <div>
                  <p className="font-medium group-hover:text-orange-500">Intervinientes</p>
                  <p className="text-sm text-zinc-500">Identificación de hablantes</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.srt}
                  onChange={(e) => setOptions({...options, srt: e.target.checked})}
                  className="mt-1 w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-orange-500"
                />
                <div>
                  <p className="font-medium group-hover:text-orange-500">Subtítulos (SRT)</p>
                  <p className="text-sm text-zinc-500">Archivo de subtítulos</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6">Tu cuenta</h3>
            
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-zinc-500">Plan actual</p>
                  <p className="text-xl font-semibold mt-1">{user.plan || 'Free'}</p>
                </div>
                <Link href="/pricing" className="text-sm text-orange-500 hover:text-orange-400">
                  Actualizar
                </Link>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Archivos procesados</span>
                    <span>{user.filesProcessed || 0} / {user.monthlyLimit || 10}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all" 
                      style={{ width: `${((user.filesProcessed || 0) / (user.monthlyLimit || 10)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Link 
              href="/results" 
              className="mt-6 flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-orange-500 transition group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-zinc-400 group-hover:text-orange-500" />
                <span className="font-medium">Ver archivos procesados</span>
              </div>
              <span className="text-zinc-400 group-hover:text-orange-500">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
