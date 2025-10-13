'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, RefreshCw, Eye, Trash2, Key, RotateCcw, CreditCard, Crown } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  subscription_plan: string;
  subscription_status: string;
  monthly_quota: number;
  monthly_usage: number;
  quota_reset_date: string;
  created_at: string;
  total_jobs: number;
  completed_jobs: number;
  last_activity: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'view' | 'edit' | 'delete' | 'resetPassword' | 'resetQuota' | 'changePlan'>('view');

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [newPlan, setNewPlan] = useState('free');
  const [trialDays, setTrialDays] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'admin') {
          alert('Acceso denegado: se requieren permisos de administrador');
          router.push('/');
          return;
        }
        loadUsers();
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterPlan) params.append('plan', filterPlan);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/200830/users?${params}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!loading) loadUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, filterPlan, filterStatus]);

  const handleAction = async () => {
    if (!selectedUser) return;

    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = {};

      switch (modalAction) {
        case 'resetPassword':
          if (!newPassword || newPassword.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres');
            return;
          }
          endpoint = `/api/200830/users/${selectedUser.id}/reset-password`;
          body = { newPassword };
          break;

        case 'resetQuota':
          endpoint = `/api/200830/users/${selectedUser.id}/reset-quota`;
          break;

        case 'changePlan':
          endpoint = `/api/200830/users/${selectedUser.id}/change-plan`;
          body = {
            plan: newPlan,
            trialDays: trialDays > 0 ? trialDays : undefined,
          };
          break;

        case 'delete':
          if (!confirm(`¿Estás seguro de eliminar al usuario ${selectedUser.email}? Esta acción no se puede deshacer.`)) {
            return;
          }
          endpoint = `/api/200830/users/${selectedUser.id}`;
          method = 'DELETE';
          break;

        default:
          return;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Acción completada exitosamente');
        setShowModal(false);
        setSelectedUser(null);
        setNewPassword('');
        setNewPlan('free');
        setTrialDays(0);
        loadUsers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Error al ejecutar la acción');
    }
  };

  const openModal = (user: User, action: typeof modalAction) => {
    setSelectedUser(user);
    setModalAction(action);
    setShowModal(true);
    if (action === 'changePlan') {
      setNewPlan(user.subscription_plan);
    }
  };

  const getUsagePercent = (usage: number, quota: number) => {
    return quota > 0 ? Math.round((usage / quota) * 100) : 0;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trialing': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-600';
      case 'basico': return 'bg-blue-600';
      case 'pro': return 'bg-purple-600';
      case 'business': return 'bg-indigo-600';
      case 'empresarial': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Crown className="h-8 w-8 text-orange-500" />
                Panel de Administración
              </h1>
              <p className="text-slate-400 text-sm mt-1">Gestión completa de usuarios y suscripciones</p>
            </div>
            <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
              ← Volver al Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-300 mb-2">Buscar Usuario</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Email o nombre..."
                  className="w-full bg-slate-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Plan */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Plan</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="free">Free</option>
                <option value="basico">Básico</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
                <option value="universidad">Universidad</option>
                <option value="medios">Medios</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="free">Free</option>
                <option value="active">Activo</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Vencido</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-400 text-sm">
              {users.length} usuario{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={loadUsers}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr className="text-left text-sm">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Plan / Estado</th>
                  <th className="px-4 py-3 font-medium">Uso</th>
                  <th className="px-4 py-3 font-medium">Actividad</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => {
                  const usagePercent = getUsagePercent(user.monthly_usage, user.monthly_quota);
                  return (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          {user.name && <p className="text-xs text-slate-400">{user.name}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPlanBadgeColor(user.subscription_plan)} w-fit`}>
                            {user.subscription_plan.toUpperCase()}
                          </span>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(user.subscription_status)} w-fit`}>
                            {user.subscription_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{user.monthly_usage} / {user.monthly_quota}</span>
                            <span className={usagePercent >= 80 ? 'text-red-400' : 'text-slate-400'}>
                              {usagePercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                usagePercent >= 100 ? 'bg-red-500' :
                                usagePercent >= 80 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <p className="text-slate-300">{user.total_jobs} archivos</p>
                          <p className="text-slate-500">
                            {user.last_activity
                              ? new Date(user.last_activity).toLocaleDateString('es-ES')
                              : 'Sin actividad'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-orange-600' : 'bg-slate-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(user, 'view')}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(user, 'changePlan')}
                            className="p-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                            title="Cambiar plan"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(user, 'resetQuota')}
                            className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                            title="Resetear cuota"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(user, 'resetPassword')}
                            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                            title="Cambiar contraseña"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(user, 'delete')}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                No se encontraron usuarios
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold">
                {modalAction === 'view' && 'Detalles del Usuario'}
                {modalAction === 'resetPassword' && 'Cambiar Contraseña'}
                {modalAction === 'resetQuota' && 'Resetear Cuota'}
                {modalAction === 'changePlan' && 'Cambiar Plan'}
                {modalAction === 'delete' && 'Eliminar Usuario'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{selectedUser.email}</p>
            </div>

            <div className="p-6">
              {modalAction === 'view' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Email</label>
                      <p className="text-sm">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nombre</label>
                      <p className="text-sm">{selectedUser.name || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Plan</label>
                      <p className="text-sm">{selectedUser.subscription_plan}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Estado</label>
                      <p className="text-sm">{selectedUser.subscription_status}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Uso</label>
                      <p className="text-sm">{selectedUser.monthly_usage} / {selectedUser.monthly_quota}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rol</label>
                      <p className="text-sm">{selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Total Archivos</label>
                      <p className="text-sm">{selectedUser.total_jobs}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Completados</label>
                      <p className="text-sm">{selectedUser.completed_jobs}</p>
                    </div>
                  </div>
                </div>
              )}

              {modalAction === 'resetPassword' && (
                <div>
                  <label className="block text-sm mb-2">Nueva Contraseña (mínimo 8 caracteres)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {modalAction === 'resetQuota' && (
                <div>
                  <p className="text-slate-300 mb-4">
                    ¿Estás seguro de resetear la cuota del usuario <strong>{selectedUser.email}</strong>?
                  </p>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-300">Uso actual: <strong>{selectedUser.monthly_usage} / {selectedUser.monthly_quota}</strong></p>
                    <p className="text-sm text-slate-300 mt-2">Después del reset: <strong>0 / {selectedUser.monthly_quota}</strong></p>
                  </div>
                </div>
              )}

              {modalAction === 'changePlan' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Nuevo Plan</label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="free">Free (10 archivos/mes)</option>
                      <option value="basico">Básico (25 archivos/mes)</option>
                      <option value="pro">Pro (100 archivos/mes)</option>
                      <option value="business">Business (500 archivos/mes)</option>
                      <option value="universidad">Universidad (2000 archivos/mes)</option>
                      <option value="medios">Medios (5000 archivos/mes)</option>
                      <option value="empresarial">Empresarial (ilimitado)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Días de Trial (opcional)</label>
                    <input
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                      min="0"
                      max="90"
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="0 = sin trial"
                    />
                  </div>
                </div>
              )}

              {modalAction === 'delete' && (
                <div>
                  <p className="text-red-400 font-medium mb-4">
                    ⚠️ Esta acción es permanente y no se puede deshacer
                  </p>
                  <p className="text-slate-300 mb-2">
                    Se eliminará:
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                    <li>Usuario: {selectedUser.email}</li>
                    <li>Todos sus archivos procesados ({selectedUser.total_jobs} archivos)</li>
                    <li>Todo su historial de actividad</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                  setNewPlan('free');
                  setTrialDays(0);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              {modalAction !== 'view' && (
                <button
                  onClick={handleAction}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    modalAction === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {modalAction === 'delete' ? 'Eliminar' : 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
