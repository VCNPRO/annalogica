'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
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
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sesión expirada');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const uploadResponse = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ filename: file.name })
        });

        if (!uploadResponse.ok) throw new Error('Error al obtener URL');

        const { uploadUrl, fields } = await uploadResponse.json();

        const formData = new FormData();
        Object.keys(fields).forEach(key => formData.append(key, fields[key]));
        formData.append('file', file);

        await fetch(uploadUrl, { method: 'POST', body: formData });
        
        setProgress(((i + 1) / files.length) * 100);
      }

      alert('Archivos subidos correctamente');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner superior */}
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        🚀 Modo Producción - Usuario: {user?.email || 'Usuario'}
        <button onClick={handleLogout} className="ml-2 underline hover:no-underline">
          Cerrar sesión
        </button>
      </div>

      {/* Botón ajustes */}
      <div className="fixed top-16 right-6 z-40">
        <Link href="/settings" className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-600">Ajustes</span>
          <span>⚙️</span>
        </Link>
      </div>

      <div className="flex pt-10" style={{ height: '100vh' }}>
        {/* Sidebar izquierdo */}
        <div className="bg-white border-r border-gray-200 p-6 flex flex-col" style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}>
          
          <div className="flex items-center mb-6">
            <h1 className="text-3xl text-orange-500 tracking-tight font-black">anna logica</h1>
          </div>

          {/* Carga de archivos */}
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
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  accept="audio/*,video/*,.txt,.docx,.pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>

            {uploading && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center">{progress.toFixed(0)}%</p>
              </div>
            )}
          </div>

          {/* Acciones IA */}
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

        {/* Área principal */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ height: '100%' }}>
          <div className="mb-6" style={{ height: '28px' }}></div>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className="text-sm font-medium text-gray-900">Archivos</h2>
              </div>
              <p className="text-xs text-gray-600">Archivos cargados y resultados del procesamiento</p>
            </div>

            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <input type="checkbox" className="rounded border-gray-300 scale-75" />
                <span className="text-xs font-medium text-gray-900 flex-1">Nombre Archivo</span>
                <span className="text-xs font-medium text-gray-600 text-center" style={{ minWidth: '80px' }}>Estado</span>
                <span className="text-xs font-medium text-gray-600">Acciones</span>
              </div>
            </div>

            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-500">Aún no has subido ningún archivo.</p>
              <Link href="/results" className="text-xs text-orange-500 hover:underline mt-2 inline-block">
                Ver archivos procesados →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
