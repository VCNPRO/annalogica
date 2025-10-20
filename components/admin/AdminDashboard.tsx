// DÓNDE: components/admin/AdminDashboard.tsx
// VERSIÓN FINAL CORREGIDA: Se añade la directiva 'use client' para solucionar el error de React.
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Sun, Moon, Users, Euro, Server, PieChart, CheckCircle, AlertTriangle, MoreHorizontal, History, Replace, LogIn, Ban, X, Clock, File, User, Tag } from 'lucide-react';

// --- SUB-COMPONENTES DE UI ---

const KpiCard = ({ title, value, icon, trend, trendDirection }: { title: string; value: string; icon: ReactNode; trend: string; trendDirection: 'up' | 'down' | 'none'; }) => {
  const trendColor = trendDirection === 'up' ? 'text-green-500' : trendDirection === 'down' ? 'text-red-500' : 'text-gray-400';
  return (
    <div className="bg-white dark:bg-gray-800/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className="text-gray-400">{icon}</div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-2">{value}</p>
      <p className={`text-xs ${trendColor} mt-1`}>{trend}</p>
    </div>
  );
};

const JobDetailPanel = ({ job, onClose }: { job: any | null, onClose: () => void }) => {
    if (!job) return null;

    const statusConfig: any = {
        COMPLETED: { icon: <CheckCircle size={14} />, color: 'text-green-500' },
        PROCESSING: { icon: <Clock size={14} />, color: 'text-blue-500' },
        FAILED: { icon: <AlertTriangle size={14} />, color: 'text-red-500' },
        QUEUED: { icon: <Clock size={14} />, color: 'text-yellow-500' },
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out" style={{ transform: job ? 'translateX(0)' : 'translateX(100%)' }}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalles del Trabajo</h2>
                        <p className="text-xs text-gray-500 font-mono">{job.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Resumen del Trabajo */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <File size={16} className="text-gray-400" />
                            <span className="font-medium">{job.filename}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User size={16} className="text-gray-400" />
                            <span>{job.userEmail}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Tag size={16} className="text-gray-400" />
                            <span className={`flex items-center gap-2 text-sm font-medium ${statusConfig[job.status]?.color}`}>
                                {statusConfig[job.status]?.icon} {job.status}
                            </span>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Timeline de Eventos */}
                    <div>
                        <h3 className="font-semibold mb-4">Línea de Tiempo del Proceso</h3>
                        <div className="space-y-4">
                            {job.steps.map((step: any, index: number) => (
                                <div key={index} className="flex gap-4">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : step.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                        {step.status === 'COMPLETED' ? <CheckCircle size={16} /> : step.status === 'FAILED' ? <X size={16} /> : <Clock size={16} />}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium text-sm">{step.name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{step.duration}</p>
                                        </div>
                                        {step.error && (
                                            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md">
                                                <p className="text-xs text-red-600 dark:text-red-400 font-mono">{step.error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold mb-3">Acciones de Administrador</h3>
                    <div className="flex gap-2">
                         <button className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded-md">Re-procesar Trabajo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- EL CEREBRO PRINCIPAL: AdminDashboard ---
export function AdminDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    // Usamos datos de ejemplo con la nueva estructura detallada
    const mockData = {
        kpis: { activeUsers: '12', revenue: '0.00', apiCosts: '0.84', grossMargin: '0.00' },
        users: [
          { id: 'd8ffa022', email: 'pagament@pagament.com', plan: 'basico', registeredAt: '11/10/2025', usage: { totalFiles: 100, breakdown: '100/100' } },
          { id: 'd4f39938', email: 'test@test.com', plan: 'admin', registeredAt: '06/10/2025', usage: { totalFiles: 10, breakdown: '10/10' } },
        ],
        jobs: [
            { id: 'job_1a2b3c4d', userEmail: 'nuevo.usuario@gmail.com', filename: 'reunion_semanal.mp3', status: 'COMPLETED', createdAt: '2025-10-20 18:15:00', duration: '45s',
              steps: [
                { name: 'UPLOAD', status: 'COMPLETED', duration: '2s', error: null },
                { name: 'TRANSCRIPCIÓN (DEEPGRAM)', status: 'COMPLETED', duration: '28s', error: null },
                { name: 'RESUMEN (OPENAI)', status: 'COMPLETED', duration: '5s', error: null },
              ],
              costs: { transcription: '€0.08', summary: '€0.04', total: '€0.12' }
            },
            { id: 'job_9i0j1k2l', userEmail: 'test@test.com', filename: 'audio_largo_con_ruido.wav', status: 'FAILED', createdAt: '2025-10-20 18:20:00', duration: '12s',
              steps: [
                { name: 'UPLOAD', status: 'COMPLETED', duration: '3s', error: null },
                { name: 'TRANSCRIPCIÓN (DEEPGRAM)', status: 'FAILED', duration: '9s', error: 'API Error 502: Upstream server timed out after 8000ms' },
                { name: 'RESUMEN (OPENAI)', status: 'SKIPPED', duration: '0s', error: null },
              ],
              costs: { transcription: '€0.05', summary: '€0.00', total: '€0.05' }
            },
        ]
    };
    setData(mockData);
    setIsLoading(false);
  }, []);

  useEffect(() => { 
    const savedTheme = localStorage.getItem('theme') || 'light';
    const newIsDark = savedTheme === 'dark';
    setIsDarkMode(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newIsDark);
  };

  if (isLoading) { return <div className="text-center p-12 dark:text-gray-300">Cargando Centro de Mando...</div>; }
  if (!data) { return <div className="text-center p-12 text-red-500">Error al cargar los datos del panel.</div>}

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Centro de Mando</h1><p className="mt-1 text-gray-500 dark:text-gray-400">Visión general y diagnóstico de Annalogica</p></div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">{isDarkMode ? <Sun /> : <Moon />}</button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Usuarios Activos" value={data.kpis.activeUsers} icon={<Users size={20} />} trend="" trendDirection="none" />
        <KpiCard title="Ingresos (Mes)" value={`€${data.kpis.revenue}`} icon={<Euro size={20} />} trend="" trendDirection="none" />
        <KpiCard title="Costes APIs (Mes)" value={`€${data.kpis.apiCosts}`} icon={<Server size={20} />} trend="-69% (migración)" trendDirection="up" />
        <KpiCard title="Margen Bruto" value={`${data.kpis.grossMargin}%`} icon={<PieChart size={20} />} trend="Objetivo: > 85%" trendDirection="none" />
      </div>
      
      <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Registro de Actividad de Trabajos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase"></th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Archivo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Duración</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Coste</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.jobs.map((job: any) => (
                  <tr key={job.id} onClick={() => setSelectedJob(job)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                        <span className={`flex items-center gap-2 text-sm font-medium ${job.status === 'COMPLETED' ? 'text-green-500' : job.status === 'FAILED' ? 'text-red-500' : 'text-blue-500'}`}>
                            {job.status === 'COMPLETED' ? <CheckCircle size={16} /> : job.status === 'FAILED' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{job.filename}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{job.userEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{job.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{job.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{job.costs.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </>
  );
}

