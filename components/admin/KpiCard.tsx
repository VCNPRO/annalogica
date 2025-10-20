// DÓNDE: components/admin/KpiCard.tsx
// MISIÓN: Mostrar una métrica clave (KPI).

import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend: string;
  trendDirection: 'up' | 'down' | 'none';
}

export default function KpiCard({ title, value, icon, trend, trendDirection }: KpiCardProps) {
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
}

