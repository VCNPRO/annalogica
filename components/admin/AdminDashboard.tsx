// DÓNDE: components/admin/AdminDashboard.tsx
// VERSIÓN DEFINITIVA: Todos los sub-componentes están en este único archivo para eliminar errores.
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Sun, Moon, Users, Euro, Server, PieChart, CheckCircle, AlertTriangle, MoreHorizontal } from 'lucide-react';

// --- PIEZA DE LEGO 1: KpiCard (definida aquí mismo) ---
const KpiCard = ({ title, value, icon, trend, trendDirection }: {
  title: string;
  value: string;
  icon: ReactNode;
  trend: string;
  trendDirection: 'up' | 'down' | 'none';
}) => {
  const trendColor = trendDirection === 'up' ? 'text-green-600' :
                     trendDirection === 'down' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-transform hover:-translate-y-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{value}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg">
          {icon}
        </div>
      </div>
      <p className={`text-xs ${trendColor} flex items-center mt-4`}>{trend}</p>
    </div>
  );
};


// --- PIEZA DE LEGO 2: ClientTable (definida aquí mismo) ---
interface UserData {
  id: string;
  email: string;
  plan: string;
  registeredAt: string;
  usage: {
    totalFiles: number;
    breakdown: string;
  };
}

const ClientTable = ({ users }: { users: UserData[] }) => {
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold">Gestión de Clientes</h2>
        <input 
          type="text" 
          placeholder="Buscar por email..." 
          className="mt-4 block w-full sm:w-1/3 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm p-2"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Uso Detallado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha Registro</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.plan === 'Pro' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{`${user.usage.totalFiles} archivos (${user.usage.breakdown})`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.registeredAt}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                    <MoreHorizontal />
                  </button>
                </td>
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
    fetch('/api/admin/dashboard-data')
      .then(res => res.json())
      .then(fetchedData => {
        if (fetchedData.error) {
          console.error("Error fetching admin data:", fetchedData.error);
        } else {
          setData(fetchedData);
        }
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setIsDarkMode(savedTheme === 'dark');
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  if (isLoading) { return <div className="text-center p-12 dark:text-gray-300">Cargando Centro de Mando...</div>; }
  if (!data) { return <div className="text-center p-12 text-red-500">Error al cargar los datos del panel. Revisa la consola.</div>}

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Centro de Mando</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Visión general de Annalogica</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">{isDarkMode ? <Sun /> : <Moon />}</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Usuarios Activos" value={data.kpis.activeUsers} icon={<Users />} trend="+12.5%" trendDirection="up" />
        <KpiCard title="Ingresos (Mes)" value={`€${data.kpis.revenue}`} icon={<Euro />} trend="+25.2%" trendDirection="up" />
        <KpiCard title="Costes APIs (Mes)" value={`€${data.kpis.apiCosts}`} icon={<Server />} trend="-69%" trendDirection="up" />
        <KpiCard title="Margen Bruto" value={`${data.kpis.grossMargin}%`} icon={<PieChart />} trend="Objetivo: > 85%" trendDirection="none" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Actividad Financiera</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">Gráfico de barras</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
           <h3 className="text-lg font-semibold">Estado del Sistema</h3>
           <div className="space-y-3 mt-4 text-sm">
              <p className="flex items-center justify-between"><span>APIs</span><span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/>Operativo</span></p>
              <p className="flex items-center justify-between"><span>Base de Datos</span><span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/>Operativo</span></p>
              <p className="flex items-center justify-between"><span>Inngest</span><span className="flex items-center text-yellow-500"><AlertTriangle className="w-4 h-4 mr-1"/>1 Error Reciente</span></p>
           </div>
        </div>
      </div>

      <ClientTable users={data.users} />
    </>
  );
}

