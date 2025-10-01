// Fixed version
'use client';

import { useFileProcessing } from '@/hooks/useFileProcessing';
import { Upload, Settings, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const { uploading, progress, error, processFile } = useFileProcessing();
  const [options, setOptions] = useState({
    summary: true,
    summaryType: 'detailed' as 'short' | 'detailed',
    tags: true,
    speakers: true
  });
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    setSuccess(false);
    
    try {
      await processFile(file, options);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-orange-600 mb-2">anna logica</h1>
            <p className="text-gray-600">Hola, {user.name || user.email}</p>
            <p className="text-sm text-gray-500">
              Plan: {user.plan || 'free'} - {user.filesProcessed || 0}/{user.monthlyLimit || 10} archivos
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/pricing" className="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all">
              <CreditCard className="h-6 w-6 text-gray-600" />
            </Link>
            <Link href="/settings" className="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all">
              <Settings className="h-6 w-6 text-gray-600" />
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Salir
            </button>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Subir Archivo</h2>
          
          <div className="border-2 border-dashed border-orange-300 rounded-lg p-12 text-center mb-6">
            <Upload className="mx-auto h-12 w-12 text-orange-500 mb-4" />
            <label className="cursor-pointer">
              <span className="text-orange-600 font-semibold hover:text-orange-700">
                Selecciona un archivo
              </span>
              <input
                type="file"
                className="hidden"
                accept=".mp3,.mp4,.wav,.m4a,.mov,.avi,.webm,.mkv,.flac,.ogg,.txt"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Audio, Video, Documentos</p>
          </div>

          {uploading && (
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Subiendo...</span>
                <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ✓ Archivo subido correctamente
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Opciones</h2>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={options.summary} onChange={(e) => setOptions({...options, summary: e.target.checked})} />
              <span>Resumen</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={options.tags} onChange={(e) => setOptions({...options, tags: e.target.checked})} />
              <span>Tags</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={options.speakers} onChange={(e) => setOptions({...options, speakers: e.target.checked})} />
              <span>Intervinientes</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
