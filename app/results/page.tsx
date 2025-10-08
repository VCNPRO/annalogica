'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

export default function Results() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadPDF = async (txtUrl: string, filename: string) => {
    try {
      setLoading(true);
      // 1. Fetch the transcription text
      const textRes = await fetch(txtUrl);
      if (!textRes.ok) {
        throw new Error('Failed to fetch transcription text');
      }
      const text = await textRes.text();

      // 2. Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // 3. Set properties and add content
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const usableWidth = pageWidth - (margin * 2);
      
      // Set font styles for header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('TRANSCRIPCIÓN DE AUDIO', pageWidth / 2, margin, { align: 'center' });

      // Set font styles for metadata
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Archivo: ${filename}`, margin, margin + 15);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, margin + 20);
      
      doc.line(margin, margin + 25, pageWidth - margin, margin + 25); // Separator line

      // Set font styles for body and add content with wrapping
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(text, usableWidth);
      doc.text(splitText, margin, margin + 35);

      // 4. Save the PDF
      doc.save(`${filename.replace(/\.[^/.]+$/, '')}-transcripcion.pdf`);

    } catch (error) {
      alert('Error generando PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!confirm('¿Eliminar?')) return;
    
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
      alert('Error');
    }
  };

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  if (loading) return <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}><div className="text-orange-500">Cargando...</div></div>;

  return (
    <div className={`min-h-screen ${bgPrimary} p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className={`${bgSecondary} rounded-lg ${border} border`}>
          <div className={`px-6 py-4 ${border} border-b`}>
            <h1 className={`text-lg font-semibold ${textPrimary}`}>Todos los Archivos</h1>
            <p className={`text-sm ${textSecondary} mt-1`}>{files.length} archivos totales</p>
          </div>
          
          {files.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className={`text-sm ${textSecondary}`}>No hay archivos</p>
            </div>
          ) : (
            <div>
              {files.map((file: any) => (
                <div key={file.name} className={`px-6 py-4 ${border} border-b hover:bg-zinc-800 transition-colors`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm ${textPrimary} truncate flex-1`}>{file.name}</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => downloadFile(file.txtUrl)} className="text-blue-500 hover:underline">TXT</button>
                        <span className={textSecondary}>|</span>
                        <button onClick={() => downloadFile(file.srtUrl)} className="text-green-500 hover:underline">SRT</button>
                        <span className={textSecondary}>|</span>
                        {file.vttUrl && <><button onClick={() => downloadFile(file.vttUrl)} className="text-cyan-500 hover:underline">VTT</button><span className={textSecondary}>|</span></>}
                        <button onClick={() => downloadPDF(file.txtUrl, file.name)} className="text-purple-500 hover:underline">PDF</button>
                        {file.summaryUrl && <><span className={textSecondary}>|</span><button onClick={() => downloadFile(file.summaryUrl)} className="text-amber-500 hover:underline">Resumen</button></>}
                        <span className={textSecondary}>|</span>
                        <button onClick={() => deleteFile(file.name)} className="text-red-500 hover:underline">Eliminar</button>
                      </div>
                      {file.audioDuration && (
                        <span className={`text-xs ${textSecondary}`}>
                          Duración: {Math.floor(file.audioDuration / 60)}:{String(file.audioDuration % 60).padStart(2, '0')} min
                        </span>
                      )}
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