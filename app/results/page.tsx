'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Film } from 'lucide-react';
import Link from 'next/link';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export default function Results() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/" className="text-4xl font-bold text-orange-600 mb-2 inline-block">
            anna logica
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-4">Mis Archivos</h2>
        </header>

        {loading ? (
          <p className="text-gray-600">Cargando...</p>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No tienes archivos procesados aún</p>
            <Link href="/" className="text-orange-600 hover:underline">
              Sube tu primer archivo →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {files.map((file, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{file.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{file.date}</p>
                    
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => downloadFile(file.transcriptKey, 'transcripcion.txt')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4" />
                        Transcripción
                      </button>
                      
                      {file.hasSummary && (
                        <button
                          onClick={() => downloadFile(file.summaryKey, 'resumen.txt')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Download className="h-4 w-4" />
                          Resumen
                        </button>
                      )}
                      
                      {file.hasSRT && (
                        <button
                          onClick={() => downloadFile(file.srtKey, 'subtitulos.srt')}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          <Film className="h-4 w-4" />
                          Subtítulos SRT
                        </button>
                      )}
                      
                      {file.hasPDF && (
                        <button
                          onClick={() => downloadFile(file.pdfKey, 'informe.pdf')}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <FileText className="h-4 w-4" />
                          PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/" className="text-orange-600 hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
