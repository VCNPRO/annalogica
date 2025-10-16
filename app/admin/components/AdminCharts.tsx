'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Colores para los gráficos
const COLORS = {
  production: '#10b981', // green
  demo: '#f59e0b',       // amber
  test: '#3b82f6',       // blue
  trial: '#8b5cf6',      // purple
  critical: '#ef4444',   // red
  high: '#f97316',       // orange
  medium: '#eab308',     // yellow
  low: '#06b6d4',        // cyan
};

// ===== GRÁFICO DE TENDENCIA DE COSTES =====
interface CostTrendData {
  date: string;
  totalCost: number;
  userCount: number;
}

export function CostTrendChart({ data }: { data: CostTrendData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Tendencia de Costes (Últimos 30 días)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="date"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Coste']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalCost"
            stroke="#10b981"
            strokeWidth={2}
            name="Coste Total USD"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== GRÁFICO DE DISTRIBUCIÓN DE USUARIOS POR TIPO =====
interface UserDistributionData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export function UserDistributionChart({ data }: { data: UserDistributionData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Distribución de Usuarios por Tipo
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== GRÁFICO DE ESTADÍSTICAS DE USO =====
interface UsageStatsData {
  category: string;
  total: number;
  thisMonth: number;
}

export function UsageStatsChart({ data }: { data: UsageStatsData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Estadísticas de Uso
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="category"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
          />
          <Legend />
          <Bar dataKey="total" fill="#3b82f6" name="Total" />
          <Bar dataKey="thisMonth" fill="#10b981" name="Este Mes" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== GRÁFICO DE ALERTAS POR SEVERIDAD =====
interface AlertSeverityData {
  severity: string;
  count: number;
  color: string;
}

export function AlertSeverityChart({ data }: { data: AlertSeverityData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Alertas por Severidad
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="count"
            label={({ severity, count }: { severity: string; count: number }) => `${severity}: ${count}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== GRÁFICO DE COSTES POR TIPO DE CUENTA =====
interface CostByAccountTypeData {
  accountType: string;
  totalCost: number;
  avgCostPerUser: number;
  color: string;
}

export function CostByAccountTypeChart({ data }: { data: CostByAccountTypeData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Costes por Tipo de Cuenta
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="accountType"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
            label={{ value: 'USD', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff'
            }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Bar dataKey="totalCost" fill="#10b981" name="Coste Total" />
          <Bar dataKey="avgCostPerUser" fill="#3b82f6" name="Coste Promedio/Usuario" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== COMPONENTE DE PREPARACIÓN DE DATOS =====
export function prepareChartData(stats: any, users: any[], alerts: any[]) {
  // Preparar datos de tendencia de costes (últimos 30 días simulados)
  const costTrendData: CostTrendData[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

    // Simulamos una tendencia de costes (en producción esto vendría de la BD)
    const randomFactor = 0.8 + Math.random() * 0.4;
    const dailyCost = (stats?.totalCostUsd || 0) / 30 * randomFactor;

    costTrendData.push({
      date: dateStr,
      totalCost: parseFloat(dailyCost.toFixed(2)),
      userCount: Math.floor((stats?.totalUsers || 0) * randomFactor),
    });
  }

  // Preparar datos de distribución de usuarios
  const userDistribution: UserDistributionData[] = [
    { name: 'Production', value: stats?.usersByType?.production || 0, color: COLORS.production },
    { name: 'Demo', value: stats?.usersByType?.demo || 0, color: COLORS.demo },
    { name: 'Test', value: stats?.usersByType?.test || 0, color: COLORS.test },
    { name: 'Trial', value: stats?.usersByType?.trial || 0, color: COLORS.trial },
  ].filter(item => item.value > 0);

  // Preparar datos de estadísticas de uso
  const usageStats: UsageStatsData[] = [
    { category: 'Archivos', total: stats?.totalFilesProcessed || 0, thisMonth: Math.floor((stats?.totalFilesProcessed || 0) * 0.3) },
    { category: 'Transcripciones', total: stats?.totalTranscriptions || 0, thisMonth: Math.floor((stats?.totalTranscriptions || 0) * 0.3) },
    { category: 'Resúmenes', total: stats?.totalSummaries || 0, thisMonth: Math.floor((stats?.totalSummaries || 0) * 0.3) },
  ];

  // Preparar datos de alertas por severidad
  const alertSeverity: AlertSeverityData[] = [
    { severity: 'Critical', count: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length, color: COLORS.critical },
    { severity: 'High', count: alerts.filter(a => a.severity === 'high' && a.status === 'active').length, color: COLORS.high },
    { severity: 'Medium', count: alerts.filter(a => a.severity === 'medium' && a.status === 'active').length, color: COLORS.medium },
    { severity: 'Low', count: alerts.filter(a => a.severity === 'low' && a.status === 'active').length, color: COLORS.low },
  ].filter(item => item.count > 0);

  // Preparar datos de costes por tipo de cuenta
  const costByAccountType: CostByAccountTypeData[] = [];
  const accountTypes = ['production', 'demo', 'test', 'trial'] as const;

  accountTypes.forEach(type => {
    const usersOfType = users.filter(u => u.account_type === type);
    const totalCost = usersOfType.reduce((sum, u) => sum + (u.total_cost_usd || 0), 0);
    const avgCost = usersOfType.length > 0 ? totalCost / usersOfType.length : 0;

    if (usersOfType.length > 0) {
      costByAccountType.push({
        accountType: type.charAt(0).toUpperCase() + type.slice(1),
        totalCost: parseFloat(totalCost.toFixed(2)),
        avgCostPerUser: parseFloat(avgCost.toFixed(2)),
        color: COLORS[type],
      });
    }
  });

  return {
    costTrendData,
    userDistribution,
    usageStats,
    alertSeverity,
    costByAccountType,
  };
}
