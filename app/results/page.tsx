'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Sun, Moon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export default function Results() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (key: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/download?key=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      }
    } catch (error) {
      alert('Error al descargar archivo');
    }
  };

  const deleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedFiles.length} archivos seleccionados?`)) return;

    try {
      const token = localStorage.getItem('token');
      
      for (const fileName of selectedFiles) {
        await fetch(`${API_URL}/files/${encodeURIComponent(fileName)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.name)));
      setSelectedFiles([]);
      alert('Archivos eliminados correctamente');
    } catch (err) {
      alert('Error al eliminar archivos');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedFiles(checked ? files.map(f => f.name) : []);
  };

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';
  const hover = darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-50';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Archivos Procesados
      </div>

      <div className="fixed top-16 right-6 z-40 flex items-center gap-2">
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <Link href="/settings" className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}>
          <span className={`text-sm ${textSecondary}`}>Ajustes</span>
          <span>⚙️</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className={`flex items-center gap-2 ${textSecondary} hover:text-orange-500`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Volver al dashboard</span>
            </Link>
          </div>
          
          {selectedFiles.length > 0 && (
            <button 
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Eliminar {selectedFiles.length} seleccionados
            </button>
          )}
        </div>

        <div className={`${bgSecondary} rounded-lg ${border} border overflow-hidden`}>
          <div className={`px-6 py-4 ${border} border-b`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-500 text-xl">📁</span>
              <h1 className={`text-xl font-semibold ${textPrimary}`}>Archivos Procesados</h1>
            </div>
            <p className={`text-sm ${textSecondary}`}>
              {files.length} {files.length === 1 ? 'archivo procesado' : 'archivos procesados'}
            </p>
          </div>

          {files.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className={`${textSecondary} mb-4`}>
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className={`${textSecondary} mb-4`}>No hay archivos procesados</p>
              <Link href="/" className="text-orange-500 hover:underline text-sm font-medium">
                Subir tu primer archivo →
              </Link>
            </div>
          ) : (
            <>
              <div className={`px-6 py-3 ${border} border-b`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 scale-75"
                    checked={selectedFiles.length === files.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span className={`text-xs font-medium ${textPrimary} flex-1`}>Nombre</span>
                  <span className={`text-xs font-medium ${textSecondary}`} style={{ minWidth: '120px' }}>Fecha</span>
                  <span className={`text-xs font-medium ${textSecondary}`} style={{ minWidth: '200px' }}>Descargas</span>
                </div>
              </div>

              <div className={`divide-y ${border}`}>
                {files.map((file, idx) => (
                  <div key={idx} className={`px-6 py-4 ${hover} transition-colors`}>
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 scale-75"
                        checked={selectedFiles.includes(file.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(prev => [...prev, file.name]);
                          } else {
                            setSelectedFiles(prev => prev.filter(n => n !== file.name));
                          }
                        }}
                      />
                      
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${textPrimary} truncate`}>{file.name}</p>
                      </div>

                      <div className={`text-xs ${textSecondary}`} style={{ minWidth: '120px' }}>
                        {new Date(file.date).toLocaleDateString('es-ES')}
                      </div>

                      <div className="flex gap-2" style={{ minWidth: '200px' }}>
                        {file.transcriptKey && (
                          <button
                            onClick={() => downloadFile(file.transcriptKey, 'transcripcion.txt')}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            TXT
                          </button>
                        )}
                        
                        {file.srtKey && (
                          <button
                            onClick={() => downloadFile(file.srtKey, 'subtitulos.srt')}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            SRT
                          </button>
                        )}

                        {file.summaryKey && (
                          <button
                            onClick={() => downloadFile(file.summaryKey, 'resumen.txt')}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Resumen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
