// DÓNDE: components/admin/AdminDashboard.tsx
'use client';
import { useState, useEffect } from 'react';
import { KpiCard } from './KpiCard';
import { ClientTable } from './ClientTable';
import { Sun, Moon, Users, Euro, Server, PieChart, CheckCircle, AlertTriangle } from 'lucide-react';

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
          // Opcional: mostrar un mensaje de error en la UI
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
      
      <ClientTable users={data.users} />
    </>
  );
}

