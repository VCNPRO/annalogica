// DÓNDE: components/admin/AdminDashboard.tsx
// VERSIÓN PROFESIONAL: Soluciona errores de UI y añade un panel de diagnóstico técnico.
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Sun, Moon, Users, Euro, Server, PieChart, CheckCircle, AlertTriangle, MoreHorizontal, History, Replace, LogIn, Ban } from 'lucide-react';

// --- PIEZA 1: KpiCard ---
const KpiCard = ({ title, value, icon, trend, trendDirection }: { title: string; value: string; icon: ReactNode; trend: string; trendDirection: 'up' | 'down' | 'none'; }) => {
  const trendColor = trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400';
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:-translate-y-1">
      <div className="flex justify-between items-start">
        <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p><p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{value}</p></div>
        <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg">{icon}</div>
      </div>
      <p className={`text-xs ${trendColor} flex items-center mt-4`}>{trend}</p>
    </div>
  );
};

// --- PIEZA 2: ClientTable ---
const ClientTable = ({ users }: { users: any[] }) => {
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-semibold">Gestión de Clientes</h2><input type="text" placeholder="Buscar por email..." className="mt-4 block w-full sm:w-1/3 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/10 shadow-sm p-2" /></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Uso Detallado</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha Registro</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.plan === 'Pro' || user.plan === 'basico' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user.plan}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{`${user.usage.totalFiles} archivos (${user.usage.breakdown})`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.registeredAt}</td>
                <td className="px-6 py-4 whitespace-nowrap relative">
                  <div className="group inline-block">
                    <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"><MoreHorizontal /></button>
                    <div className="absolute hidden group-hover:block right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                        <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><History size={16}/> Ver Historial</a>
                        <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><Replace size={16}/> Cambiar Plan</a>
                        <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><LogIn size={16}/> Impersonar</a>
                        <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Ban size={16}/> Suspender</a>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- ¡NUEVA PIEZA 3! JobsTable (Panel de Diagnóstico) ---
const JobsTable = ({ jobs }: { jobs: any[] }) => {
    return (
    <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-semibold">Registro de Actividad de Trabajos</h2></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">ID Trabajo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Archivo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Coste</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Error</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {jobs.map((job) => (
              <tr key={job.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${job.status === 'FAILED' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">{job.id.slice(0, 8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{job.userEmail}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{job.filename}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          job.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                        {job.status}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{job.cost}</td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-red-600 font-mono">{job.error || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- EL CEREBRO PRINCIPAL: AdminDashboard ---
export function AdminDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Para la demo, usamos datos de ejemplo. En la app real, harías un fetch a '/api/admin/dashboard-data'
    const mockData = {
        kpis: { activeUsers: '12', revenue: '0.00', apiCosts: '0.84', grossMargin: '0.00' },
        users: [
          { id: 'd8ffa022', email: 'pagament@pagament.com', plan: 'basico', registeredAt: '11/10/2025', usage: { totalFiles: 100, breakdown: '100/100' } },
          { id: 'd4f39938', email: 'test@test.com', plan: 'admin', registeredAt: '06/10/2025', usage: { totalFiles: 10, breakdown: '10/10' } },
        ],
        jobs: [
            { id: 'job_1a2b3c4d', userEmail: 'nuevo.usuario@gmail.com', filename: 'reunion_semanal.mp3', status: 'COMPLETED', cost: '€0.12', error: null },
            { id: 'job_5e6f7g8h', userEmail: 'cliente.importante@corp.com', filename: 'propuesta_Q4.pdf', status: 'PROCESSING', cost: '€0.01', error: null },
            { id: 'job_9i0j1k2l', userEmail: 'test@test.com', filename: 'audio_largo_con_ruido.wav', status: 'FAILED', cost: '€0.05', error: 'Deepgram API timeout' },
            { id: 'job_3m4n5o6p', userEmail: 'juan.perez@betatester.com', filename: 'entrevista_candidato.m4a', status: 'QUEUED', cost: '€0.00', error: null },
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
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Centro de Mando</h1><p className="mt-1 text-gray-500 dark:text-gray-400">Visión general de Annalogica</p></div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">{isDarkMode ? <Sun /> : <Moon />}</button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Usuarios Activos" value={data.kpis.activeUsers} icon={<Users />} trend="" trendDirection="none" />
        <KpiCard title="Ingresos (Mes)" value={`${data.kpis.revenue}`} icon={<Euro />} trend="" trendDirection="none" />
        <KpiCard title="Costes APIs (Mes)" value={`€${data.kpis.apiCosts}`} icon={<Server />} trend="-69%" trendDirection="up" />
        <KpiCard title="Margen Bruto" value={`${data.kpis.grossMargin}%`} icon={<PieChart />} trend="Objetivo: > 85%" trendDirection="none" />
      </div>
      <ClientTable users={data.users} />
      <JobsTable jobs={data.jobs} />
    </>
  );
}

