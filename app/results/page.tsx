'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'https://p0qgpbsiyh.execute-api.eu-west-1.amazonaws.com';

interface FileData {
  name: string;
  date: string;
  transcriptKey: string;
  srtKey: string;
  summaryKey: string;
}

export default function Results() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    const savedMode = localStorage.getItem('darkMode');
    setDarkMode(savedMode === 'true');
    
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/files`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (key: string) => {
    try {
      const response = await fetch(`${API_URL}/download?key=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error) {
      alert('Error al descargar');
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await fetch(`${API_URL}/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadFiles();
    } catch (error) {
      alert('Error');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedFiles(checked ? files.map(f => f.name) : []);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedFiles.length} archivos?`)) return;
    
    try {
      for (const fileName of selectedFiles) {
        await fetch(`${API_URL}/files/${encodeURIComponent(fileName)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setSelectedFiles([]);
      loadFiles();
    } catch (error) {
      alert('Error eliminando archivos');
    }
  };

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  if (loading) return <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}>Cargando...</div>;

  return (
    <div className={`min-h-screen ${bgPrimary} p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className={`${bgSecondary} rounded-lg shadow`}>
          <div className={`px-6 py-4 ${border} border-b flex items-center justify-between`}>
            <div>
              <h1 className={`text-lg font-semibold ${textPrimary}`}>Todos los Archivos Procesados</h1>
              <p className={`text-sm ${textSecondary} mt-1`}>{files.length} archivos totales</p>
            </div>
            {selectedFiles.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
              >
                Eliminar {selectedFiles.length}
              </button>
            )}
          </div>
          
          <div className={`px-6 py-3 ${border} border-b ${darkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-4">
              <input 
                type="checkbox" 
                className="rounded border-gray-300"
                checked={selectedFiles.length === files.length && files.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className={`text-sm font-medium ${textPrimary} flex-1`}>Nombre Archivo</span>
              <span className={`text-sm font-medium ${textSecondary} w-96`}>Descargas</span>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className={`text-sm ${textSecondary}`}>No hay archivos procesados</p>
            </div>
          ) : (
            <div>
              {files.map((file) => (
                <div key={file.name} className={`px-6 py-4 ${border} border-b ${hover} transition-colors`}>
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedFiles.includes(file.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(prev => [...prev, file.name]);
                        } else {
                          setSelectedFiles(prev => prev.filter(n => n !== file.name));
                        }
                      }}
                    />
                    <span className={`text-sm ${textPrimary} truncate flex-1`}>{file.name}</span>
                    <div className="flex gap-2 w-96">
                      <button onClick={() => downloadFile(file.transcriptKey)} className="text-xs text-blue-600 hover:underline">TXT</button>
                      <span className={textSecondary}>|</span>
                      <button onClick={() => downloadFile(file.srtKey)} className="text-xs text-green-600 hover:underline">SRT</button>
                      <span className={textSecondary}>|</span>
                      <button onClick={() => downloadFile(file.transcriptKey.replace('.txt', '.pdf'))} className="text-xs text-purple-600 hover:underline">PDF</button>
                      <span className={textSecondary}>|</span>
                      <button onClick={() => deleteFile(file.name)} className="text-xs text-red-600 hover:underline">Eliminar</button>
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
