// DÓNDE: components/admin/AdminDashboard.tsx
// VERSIÓN FINAL CORREGIDA: Se añade la directiva 'use client' para solucionar el error de React.
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Sun, Moon, Users, Euro, Server, PieChart, CheckCircle, AlertTriangle, MoreHorizontal, History, Replace, LogIn, Ban, X, Clock, File, User, Tag } from 'lucide-react';
import ErrorMonitoringPanel from './ErrorMonitoringPanel';

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
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'docs' | 'audio' | 'plan' | null>(null);
  const [newQuota, setNewQuota] = useState<number>(0);
  const [newPlan, setNewPlan] = useState<string>('');

  // Fetch real data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats and users with credentials
        const [statsRes, usersRes] = await Promise.all([
          fetch('/api/admin/stats', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          fetch('/api/admin/users', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          })
        ]);

        // Check for errors
        if (!statsRes.ok) {
          const errorText = await statsRes.text();
          console.error('Failed to fetch stats:', {
            status: statsRes.status,
            error: errorText
          });
          setIsLoading(false);
          return;
        }

        if (!usersRes.ok) {
          const errorText = await usersRes.text();
          console.error('Failed to fetch users:', {
            status: usersRes.status,
            error: errorText
          });
          setIsLoading(false);
          return;
        }

        const stats = await statsRes.json();
        const users = await usersRes.json();

        setData({
          kpis: {
            activeUsers: stats.totalUsers?.toString() || '0',
            revenue: '0.00',
            apiCosts: stats.totalCost?.toFixed(2) || '0.00',
            grossMargin: '0.00'
          },
          users: users.users || [],
          jobs: []
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateQuota = async (userId: string, field: 'docs' | 'audio', quota: number) => {
    try {
      const res = await fetch('/api/admin/user-quotas-v2', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...(field === 'docs'
            ? { quotaDocs: quota }
            : { quotaAudioMinutes: quota })
        })
      });

      if (res.ok) {
        // Refresh data
        const usersRes = await fetch('/api/admin/users', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const users = await usersRes.json();
        setData({ ...data, users: users.users || [] });
        setEditingQuota(null);
        setEditingField(null);
        alert('✅ Cuota actualizada correctamente');
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'No se pudo actualizar'}`);
      }
    } catch (error) {
      console.error('Error updating quota:', error);
      alert('❌ Error al actualizar cuota');
    }
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          field: 'accountType',
          value: plan
        })
      });

      if (res.ok) {
        // Refresh data
        const usersRes = await fetch('/api/admin/users', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const users = await usersRes.json();
        setData({ ...data, users: users.users || [] });
        setEditingQuota(null);
        setEditingField(null);
        alert('✅ Plan actualizado correctamente');
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'No se pudo actualizar'}`);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('❌ Error al actualizar plan');
    }
  };

  const startEditingQuota = (userId: string, field: 'docs' | 'audio', currentValue: number) => {
    setEditingQuota(userId);
    setEditingField(field);
    setNewQuota(currentValue);
  };

  const startEditingPlan = (userId: string, currentPlan: string) => {
    setEditingQuota(userId);
    setEditingField('plan');
    setNewPlan(currentPlan || 'free');
  };

  const cancelEditing = () => {
    setEditingQuota(null);
    setEditingField(null);
    setNewQuota(0);
    setNewPlan('');
  };

  const handleResetUsage = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres resetear el uso de este usuario?\n\nEsto pondrá a 0 los contadores de documentos y minutos de audio usados.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/user-quotas-v2', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Refresh data
        const usersRes = await fetch('/api/admin/users', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const users = await usersRes.json();
        setData({ ...data, users: users.users || [] });
        alert('✅ Uso reseteado correctamente');
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'No se pudo resetear'}`);
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
      alert('❌ Error al resetear uso');
    }
  };

  const handleViewUserStats = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/user-stats?userId=${userId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const stats = await res.json();
        setSelectedUser(stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    // Confirmación con el email del usuario
    const confirmed = window.confirm(
      `¿Estás SEGURO de que quieres eliminar a este usuario?\n\n` +
      `Email: ${email}\n` +
      `ID: ${userId}\n\n` +
      `Esta acción NO se puede deshacer. Se eliminarán:\n` +
      `- El usuario y su contraseña\n` +
      `- Todos sus archivos procesados\n` +
      `- Todo su historial\n\n` +
      `Escribe el email para confirmar.`
    );

    if (!confirmed) return;

    // Segunda confirmación: escribir el email
    const emailConfirm = window.prompt(
      `Para confirmar la eliminación, escribe el email del usuario:\n${email}`
    );

    if (emailConfirm !== email) {
      alert('El email no coincide. Eliminación cancelada.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        alert(`Usuario ${email} eliminado correctamente.`);
        // Refresh data
        const usersRes = await fetch('/api/admin/users', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const users = await usersRes.json();
        setData({ ...data, users: users.users || [] });
      } else {
        const error = await res.json();
        alert(`Error al eliminar usuario: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario. Ver consola para detalles.');
    }
  };

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

      {/* Error Monitoring Panel */}
      <div className="mt-8">
        <ErrorMonitoringPanel />
      </div>

      {/* Beta Testers Management */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Gestión de Beta Testers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ver consumo, modificar cuotas y gestionar accesos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" title="ID corto de 4 cifras para identificación rápida">
                    🔢 ID Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipo Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" title="Documentos procesados (PDFs, DOCX, TXT) vs límite mensual">
                    📄 Documentos (usado/límite)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" title="Minutos de audio/vídeo procesados vs límite mensual">
                    🎙️ Audio Minutos (usado/límite)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Próximo Reset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data?.users?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{user.email}</span>
                        <span className="text-xs text-gray-400 font-mono">{user.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-orange-500 font-mono">
                        {user.client_id || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{user.name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingQuota === user.id && editingField === 'plan' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={newPlan}
                            onChange={(e) => setNewPlan(e.target.value)}
                            className="px-2 py-1 text-xs border border-blue-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            autoFocus
                          >
                            <option value="free">Free</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                            <option value="universidad">Universidad</option>
                            <option value="medios">Medios</option>
                            <option value="empresarial">Empresarial</option>
                          </select>
                          <button
                            onClick={() => handleUpdatePlan(user.id, newPlan)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingPlan(user.id, user.subscription_plan || user.account_type)}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                          title="Click para editar tipo de cuenta"
                        >
                          {user.subscription_plan || user.account_type || 'free'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingQuota === user.id && editingField === 'docs' ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{user.monthly_usage_docs || 0} /</span>
                          <input
                            type="number"
                            value={newQuota}
                            onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateQuota(user.id, 'docs', newQuota)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingQuota(user.id, 'docs', user.monthly_quota_docs || 10)}
                          className={`font-mono text-sm cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-2 py-1 rounded ${(user.monthly_usage_docs || 0) >= (user.monthly_quota_docs || 0) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                          title="Click para editar límite de documentos (PDFs, DOCX, TXT)"
                        >
                          {user.monthly_usage_docs || 0} / {user.monthly_quota_docs || 10} docs
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingQuota === user.id && editingField === 'audio' ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{user.monthly_usage_audio_minutes || 0} /</span>
                          <input
                            type="number"
                            value={newQuota}
                            onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateQuota(user.id, 'audio', newQuota)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingQuota(user.id, 'audio', user.monthly_quota_audio_minutes || 10)}
                          className={`font-mono text-sm cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-2 py-1 rounded ${(user.monthly_usage_audio_minutes || 0) >= (user.monthly_quota_audio_minutes || 0) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                          title="Click para editar límite de minutos de audio/vídeo procesados"
                        >
                          {user.monthly_usage_audio_minutes || 0} / {user.monthly_quota_audio_minutes || 10} min
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {user.quota_reset_date ? new Date(user.quota_reset_date).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUserStats(user.id)}
                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          Ver Stats
                        </button>
                        <button
                          onClick={() => handleResetUsage(user.id)}
                          className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50"
                        >
                          Reset Uso
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}

      {/* User Stats Panel */}
      {selectedUser && (
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Estadísticas de Usuario</h2>
                <p className="text-sm text-gray-500">{selectedUser.user?.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Información del Usuario</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium">{selectedUser.user?.subscriptionTier || 'free'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cuota Docs:</span>
                    <span className="font-medium">{selectedUser.user?.monthlyQuotaDocs || 10} docs/mes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uso Docs:</span>
                    <span className={`font-medium ${(selectedUser.user?.monthlyUsageDocs || 0) >= (selectedUser.user?.monthlyQuotaDocs || 10) ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedUser.user?.monthlyUsageDocs || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cuota Audio:</span>
                    <span className="font-medium">{selectedUser.user?.monthlyQuotaAudioMinutes || 10} min/mes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uso Audio:</span>
                    <span className={`font-medium ${(selectedUser.user?.monthlyUsageAudioMinutes || 0) >= (selectedUser.user?.monthlyQuotaAudioMinutes || 10) ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedUser.user?.monthlyUsageAudioMinutes || 0} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reset:</span>
                    <span className="font-medium">{selectedUser.user?.quotaResetDate ? new Date(selectedUser.user.quotaResetDate).toLocaleDateString('es-ES') : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown by Type */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Consumo por Tipo de Archivo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedUser.stats?.byType?.audio?.total || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Audio</div>
                    <div className="text-xs text-gray-400 mt-1">
                      ✓ {selectedUser.stats?.byType?.audio?.completed || 0} • ✗ {selectedUser.stats?.byType?.audio?.failed || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {selectedUser.stats?.byType?.document?.total || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Documentos</div>
                    <div className="text-xs text-gray-400 mt-1">
                      ✓ {selectedUser.stats?.byType?.document?.completed || 0} • ✗ {selectedUser.stats?.byType?.document?.failed || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Month Usage */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Mes Actual</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold">{selectedUser.stats?.currentMonth?.audio || 0}</div>
                    <div className="text-xs text-gray-500">Audio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{selectedUser.stats?.currentMonth?.document || 0}</div>
                    <div className="text-xs text-gray-500">Documentos</div>
                  </div>
                </div>
              </div>

              {/* Total Stats */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Totales</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold">{selectedUser.stats?.total?.jobs || 0}</div>
                    <div className="text-xs text-gray-500">Total Jobs</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{selectedUser.stats?.total?.completed || 0}</div>
                    <div className="text-xs text-gray-500">Completados</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{selectedUser.stats?.total?.failed || 0}</div>
                    <div className="text-xs text-gray-500">Fallidos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

