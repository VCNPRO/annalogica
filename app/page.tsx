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
        throw new Error('Debes iniciar sesión');
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
        
        xhr.addEventListener('error', () => reject(new Error('Error de red')));
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-orange-600">anna logica</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Link href="/results" className="p-2 hover:bg-orange-50 rounded-lg transition">
              <FileText className="h-5 w-5 text-gray-600" />
            </Link>
            <Link href="/settings" className="p-2 hover:bg-orange-50 rounded-lg transition">
              <Settings className="h-5 w-5 text-gray-600" />
            </Link>
            <button onClick={handleLogout} className="p-2 hover:bg-orange-50 rounded-lg transition">
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Panel lateral izquierdo */}
          <div className="col-span-4 space-y-6">
            
            {/* Carga de archivos */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Carga de Archivos</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Sube hasta 50 archivos de audio, video o texto.
              </p>
              
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-10 w-10 text-orange-500 mb-3" />
                <label className="cursor-pointer">
                  <span className="text-orange-600 font-semibold hover:text-orange-700">
                    Selecciona archivos
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".mp3,.mp4,.wav,.m4a,.mov,.avi,.webm,.mkv,.flac,.ogg,.txt,.pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">o arrastra y suelta aquí</p>
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Subiendo...</span>
                    <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
                  ✓ Archivo subido. Procesando...
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Opciones de procesamiento */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones IA</h3>
              <div className="space-y-3">
                
                <label className="flex items-center gap-3 cursor-pointer hover:bg-orange-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={options.transcription}
                    onChange={(e) => setOptions({...options, transcription: e.target.checked})}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-gray-700">Transcribir</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer hover:bg-orange-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={options.summary}
                    onChange={(e) => setOptions({...options, summary: e.target.checked})}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-gray-700">Resumir y Etiquetar</span>
                </label>

                {options.summary && (
                  <div className="ml-7 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={options.summaryType === 'short'}
                        onChange={() => setOptions({...options, summaryType: 'short'})}
                        className="text-orange-600"
                      />
                      <span className="text-sm text-gray-600">Corto</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={options.summaryType === 'detailed'}
                        onChange={() => setOptions({...options, summaryType: 'detailed'})}
                        className="text-orange-600"
                      />
                      <span className="text-sm text-gray-600">Detallado</span>
                    </label>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer hover:bg-orange-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={options.speakers}
                    onChange={(e) => setOptions({...options, speakers: e.target.checked})}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-gray-700">Identificar Oradores</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer hover:bg-orange-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={options.tags}
                    onChange={(e) => setOptions({...options, tags: e.target.checked})}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-gray-700">Tags</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer hover:bg-orange-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={options.srt}
                    onChange={(e) => setOptions({...options, srt: e.target.checked})}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-gray-700">Subtítulos (SRT)</span>
                </label>
              </div>
            </div>

            {/* Info cuenta */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="font-semibold text-gray-900 mb-2">Plan: {user.plan || 'Free'}</h4>
              <p className="text-sm text-gray-600">
                {user.filesProcessed || 0} / {user.monthlyLimit || 10} archivos procesados
              </p>
              <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${((user.filesProcessed || 0) / (user.monthlyLimit || 10)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Panel derecho - Archivos */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Archivos</h2>
              <p className="text-gray-600 mb-4">
                Archivos cargados y resultados del procesamiento
              </p>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre Archivo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        Aún no has subido ningún archivo.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-center">
                <Link href="/results" className="text-orange-600 hover:underline font-semibold">
                  Ver todos los archivos procesados →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
