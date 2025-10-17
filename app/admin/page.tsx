'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Activity,
  FileText,
  TrendingUp,
  Filter,
  Search,
  Download,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
  import dynamic from 'next/dynamic';
  import { prepareChartData } from './components/AdminCharts';

  const CostTrendChart = dynamic(() => import('./components/AdminCharts').then(mod => ({ default: mod.CostTrendChart })), { ssr: false });
  const UserDistributionChart = dynamic(() => import('./components/AdminCharts').then(mod => ({ default: mod.UserDistributionChart })), { ssr: false });
  const UsageStatsChart = dynamic(() => import('./components/AdminCharts').then(mod => ({ default: mod.UsageStatsChart })), { ssr: false });
  const AlertSeverityChart = dynamic(() => import('./components/AdminCharts').then(mod => ({ default: mod.AlertSeverityChart })), { ssr: false });
  const CostByAccountTypeChart = dynamic(() => import('./components/AdminCharts').then(mod => ({ default: mod.CostByAccountTypeChart })), { ssr: false });
} from './components/AdminCharts';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  usersByType: Record<string, number>;
  usersByStatus: Record<string, number>;
  totalCostAllTime: number;
  totalCostThisMonth: number;
  totalFilesProcessed: number;
  avgCostPerUser: number;
}

interface UserWithMetrics {
  id: string;
  email: string;
  name: string | null;
  role: string;
  account_type: string;
  account_status: string;
  tags: string[];
  subscription_plan: string | null;
  total_cost_usd: number;
  monthly_budget_usd: number | null;
  created_at: string;
  last_activity_at: string | null;
  total_operations: number;
  total_files: number;
  cost_last_30_days: number;
  uploads_count: number;
  transcriptions_count: number;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  user_email: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserWithMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filtros
  const [searchEmail, setSearchEmail] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estado de edición
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [searchEmail, filterType, filterStatus, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar estadísticas
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Cargar usuarios
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        limit: '50',
        offset: '0',
      });

      if (searchEmail) params.append('search', searchEmail);
      if (filterType) params.append('accountType', filterType);
      if (filterStatus) params.append('accountStatus', filterStatus);

      const usersRes = await fetch(`/api/admin/users?${params}`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
        setTotalUsers(usersData.total);
      }

      // Cargar alertas activas
      const alertsRes = await fetch('/api/admin/alerts?limit=10');
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserField = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, field, value }),
      });

      if (res.ok) {
        await loadData();
        setEditingUser(null);
        setEditValues({});
      } else {
        alert('Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const runAlertChecks = async () => {
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_all' }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error running alert checks:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'production':
        return 'bg-green-100 text-green-800';
      case 'demo':
        return 'bg-purple-100 text-purple-800';
      case 'test':
        return 'bg-yellow-100 text-yellow-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Administración</h1>
              <p className="mt-1 text-sm text-gray-500">
                Control total de usuarios, costes y métricas de Annalogica
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={runAlertChecks}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Alertas
              </button>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas Generales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {stats.activeUsers} activos
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coste Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${stats.totalCostAllTime.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ${stats.totalCostThisMonth.toFixed(2)} este mes
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Archivos Procesados</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalFilesProcessed}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Total histórico</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alertas Activas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{alerts.length}</p>
                  <p className="text-sm text-orange-600 mt-1">
                    {alerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length} críticas
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos Visuales */}
        {stats && users.length > 0 && (
          <>
            {/* Sección de Tendencias y Distribución */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CostTrendChart
                data={prepareChartData(stats, users, alerts).costTrendData}
              />
              <UserDistributionChart
                data={prepareChartData(stats, users, alerts).userDistribution}
              />
            </div>

            {/* Sección de Uso y Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <UsageStatsChart
                data={prepareChartData(stats, users, alerts).usageStats}
              />
              {alerts.length > 0 && (
                <AlertSeverityChart
                  data={prepareChartData(stats, users, alerts).alertSeverity}
                />
              )}
            </div>

            {/* Gráfico de Costes por Tipo de Cuenta */}
            <div className="mb-8">
              <CostByAccountTypeChart
                data={prepareChartData(stats, users, alerts).costByAccountType}
              />
            </div>
          </>
        )}

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Alertas Activas</h2>
                <span className="text-sm text-gray-500">{alerts.length} alertas</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">{alert.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.user_email && (
                        <p className="text-xs text-gray-500 mt-1">Usuario: {alert.user_email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todos los tipos</option>
                <option value="production">Producción</option>
                <option value="demo">Demo</option>
                <option value="test">Test</option>
                <option value="trial">Trial</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="cancelled">Cancelado</option>
                <option value="pending">Pendiente</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="cost">Ordenar por Coste</option>
                <option value="activity">Ordenar por Actividad</option>
                <option value="created">Ordenar por Fecha Registro</option>
                <option value="email">Ordenar por Email</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coste 30d
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archivos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      {user.tags && user.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {user.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                          user.account_type
                        )}`}
                      >
                        {user.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          user.account_status
                        )}`}
                      >
                        {user.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.subscription_plan || 'free'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${user.cost_last_30_days.toFixed(2)}
                      </div>
                      {user.monthly_budget_usd && (
                        <div className="text-xs text-gray-500">
                          Budget: ${user.monthly_budget_usd.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.total_files}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_activity_at
                        ? new Date(user.last_activity_at).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron usuarios con los filtros aplicados.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
