'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'https://p0qgpbsiyh.execute-api.eu-west-1.amazonaws.com';

export default function Results() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Archivos Procesados</h1>
        {files.length === 0 ? (
          <p className="text-gray-500">No hay archivos</p>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.name} className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">{file.name}</h3>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => downloadFile(file.transcriptKey)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">TXT</button>
                  <button onClick={() => downloadFile(file.srtKey)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">SRT</button>
                  <button onClick={() => downloadFile(file.transcriptKey.replace('.txt', '.pdf'))} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">PDF</button>
                  <button onClick={() => deleteFile(file.name)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
