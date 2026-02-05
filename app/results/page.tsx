'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Simplified component: this page now only lists files and links to their detail/control panel page.
export default function Results() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      // SECURITY: Cookie httpOnly se envía automáticamente
      const response = await fetch('/api/files', {
        credentials: 'include'
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const bgPrimary = darkMode ? 'bg-black' : 'bg-[#f0f4f8]';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-[#e8edf2]';
  const textPrimary = darkMode ? 'text-white' : 'text-[#1e293b]';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-[#475569]';
  const border = darkMode ? 'border-zinc-800' : 'border-[#cbd5e1]';

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
                <Link href={`/files/${file.jobId}`} key={file.jobId} className={`block px-6 py-4 ${border} border-b hover:bg-zinc-800 transition-colors`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${textPrimary} truncate`}>{file.name}</p>
                      {/* METADATA DISPLAY */}
                      {(file.metadata?.speakers?.length > 0 || file.tags?.length > 0) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          {file.metadata?.speakers?.length > 0 && (
                            <span className="flex items-center gap-1 text-zinc-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              {file.metadata.speakers.join(', ')}
                            </span>
                          )}
                          {file.metadata?.speakers?.length > 0 && file.tags?.length > 0 && (
                            <span className="text-zinc-600">|</span>
                          )}
                          {file.tags?.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                        {file.audioDuration && (
                            <span className={`text-xs`}>
                            {Math.floor(file.audioDuration / 60)}:{String(Math.round(file.audioDuration % 60)).padStart(2, '0')} min
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
