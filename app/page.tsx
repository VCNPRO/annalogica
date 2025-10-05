'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [darkMode] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress('Subiendo archivo...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      setProgress('Transcribiendo con IA (puede tardar 1-2 min)...');
      
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Error al procesar');
      
      setProgress('¡Completado!');
      setTimeout(() => {
        setProgress('');
        loadFiles();
      }, 1500);
      
    } catch (error: any) {
      alert('Error: ' + error.message);
      setProgress('');
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadPDF = async (txtUrl: string, filename: string) => {
    try {
      const textRes = await fetch(txtUrl);
      const text = await textRes.text();
      
      const pdfRes = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename })
      });
      
      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
    } catch (error) {
      alert('Error generando PDF');
    }
  };

  const deleteFile = async (filename: string) => {
    if (!confirm('¿Eliminar archivo?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/files', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });
      loadFiles();
    } catch (error) {
      alert('Error eliminando archivo');
    }
  };

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgPrimary} p-6`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl text-orange-500 font-black mb-8">anna logica</h1>
        
        <div className={`${bgSecondary} rounded-lg p-6 mb-6 ${border} border`}>
          <h2 className={`text-lg font-semibold ${textPrimary} mb-4`}>Subir Audio/Video</h2>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 disabled:opacity-50"
          />
          {progress && <p className="text-orange-500 mt-3 text-sm animate-pulse">{progress}</p>}
        </div>

        <div className={`${bgSecondary} rounded-lg ${border} border`}>
          <div className={`flex justify-between items-center px-6 py-4 ${border} border-b`}>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Archivos Procesados</h2>
              <p className={`text-xs ${textSecondary} mt-1`}>{files.length} archivos</p>
            </div>
            <Link href="/results" className="text-orange-500 text-sm hover:underline font-medium">
              Ver todos →
            </Link>
          </div>
          
          {files.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className={`text-sm ${textSecondary}`}>No hay archivos procesados</p>
            </div>
          ) : (
            <div>
              {files.slice(0, 5).map((file: any) => (
                <div key={file.name} className={`px-6 py-3 ${border} border-b hover:bg-zinc-800 transition-colors`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm ${textPrimary} truncate flex-1`}>{file.name}</span>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => downloadFile(file.txtUrl)} className="text-blue-500 hover:underline">TXT</button>
                      <span className={textSecondary}>|</span>
                      <button onClick={() => downloadFile(file.srtUrl)} className="text-green-500 hover:underline">SRT</button>
                      <span className={textSecondary}>|</span>
                      <button onClick={() => downloadPDF(file.txtUrl, file.name)} className="text-purple-500 hover:underline">PDF</button>
                      {file.summaryUrl && <><span className={textSecondary}>|</span><button onClick={() => downloadFile(file.summaryUrl)} className="text-amber-500 hover:underline">Resumen</button></>}
                      <span className={textSecondary}>|</span>
                      <button onClick={() => deleteFile(file.name)} className="text-red-500 hover:underline">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
