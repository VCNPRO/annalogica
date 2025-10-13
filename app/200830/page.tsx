'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UsageSummary {
  totalCost: number;
  uploads: number;
  transcriptions: number;
  summaries: number;
  downloads: number;
  storageMB: number;
}

interface PlatformStats extends UsageSummary {
  totalUsers: number;
  totalStorageGB: number;
  avgCostPerUser: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UsageSummary | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [view, setView] = useState<'user' | 'platform' | 'all'>('user');

  useEffect(() => {
    // Verificar autenticación
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
        // Verificar que sea admin
        if (data.user?.role !== 'admin') {
          alert('Acceso denegado: se requieren permisos de administrador');
          router.push('/');
          return;
        }
        loadData();
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [days, view, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user stats
      const userRes = await fetch(`/api/200830/usage?mode=user&days=${days}`, {
        credentials: 'include'
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserStats(userData.data);
      }

      // Load platform stats (admin only)
      if (view === 'platform') {
        const platformRes = await fetch(`/api/200830/usage?mode=platform&days=${days}`, {
          credentials: 'include'
        });
        if (platformRes.ok) {
          const platformData = await platformRes.json();
          setPlatformStats(platformData.data);
        }
      }

      // Load all users (admin only)
      if (view === 'all') {
        const allRes = await fetch(`/api/200830/usage?mode=all&days=${days}`, {
          credentials: 'include'
        });
        if (allRes.ok) {
          const allData = await allRes.json();
          setAllUsers(allData.data);
        }
      }

    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard de Costes</h1>
          <a href="/" className="text-blue-400 hover:underline">← Volver al Dashboard</a>
        </div>

        {/* Period selector */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="flex gap-4 items-center">
            <span className="text-slate-300">Período:</span>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="bg-slate-700 text-white rounded px-4 py-2"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>

            <span className="text-slate-300 ml-8">Vista:</span>
            <button
              onClick={() => setView('user')}
              className={`px-4 py-2 rounded ${view === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              Mi Uso
            </button>
            <button
              onClick={() => setView('platform')}
              className={`px-4 py-2 rounded ${view === 'platform' ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              Plataforma
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded ${view === 'all' ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              Todos los Usuarios
            </button>
          </div>
        </div>

        {/* User Stats */}
        {view === 'user' && userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Coste Total"
              value={formatCurrency(userStats.totalCost)}
              subtitle={`Últimos ${days} días`}
              color="text-green-400"
            />
            <StatCard
              title="Archivos Subidos"
              value={userStats.uploads.toString()}
              subtitle={`${userStats.storageMB.toFixed(2)} MB storage`}
              color="text-blue-400"
            />
            <StatCard
              title="Transcripciones"
              value={userStats.transcriptions.toString()}
              subtitle={`~${formatCurrency(userStats.transcriptions * 0.00046)}`}
              color="text-purple-400"
            />
            <StatCard
              title="Resúmenes IA"
              value={userStats.summaries.toString()}
              subtitle="Claude Sonnet 4.5"
              color="text-pink-400"
            />
            <StatCard
              title="Descargas"
              value={userStats.downloads.toString()}
              subtitle="TXT, SRT, PDF"
              color="text-yellow-400"
            />
            <StatCard
              title="Coste Promedio"
              value={formatCurrency(userStats.totalCost / Math.max(userStats.uploads, 1))}
              subtitle="Por archivo procesado"
              color="text-orange-400"
            />
          </div>
        )}

        {/* Platform Stats */}
        {view === 'platform' && platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Coste Total"
              value={formatCurrency(platformStats.totalCost)}
              subtitle="Toda la plataforma"
              color="text-green-400"
            />
            <StatCard
              title="Usuarios Activos"
              value={platformStats.totalUsers.toString()}
              subtitle={`Últimos ${days} días`}
              color="text-blue-400"
            />
            <StatCard
              title="Storage Total"
              value={`${platformStats.totalStorageGB.toFixed(2)} GB`}
              subtitle={`~${formatCurrency(platformStats.totalStorageGB * 0.023)}/mes`}
              color="text-purple-400"
            />
            <StatCard
              title="Coste/Usuario"
              value={formatCurrency(platformStats.avgCostPerUser)}
              subtitle="Promedio"
              color="text-orange-400"
            />
            <StatCard
              title="Transcripciones"
              value={platformStats.transcriptions.toString()}
              subtitle="Total procesadas"
              color="text-pink-400"
            />
            <StatCard
              title="Resúmenes IA"
              value={platformStats.summaries.toString()}
              subtitle="Total generados"
              color="text-yellow-400"
            />
            <StatCard
              title="Uploads"
              value={platformStats.uploads.toString()}
              subtitle="Archivos subidos"
              color="text-cyan-400"
            />
            <StatCard
              title="Downloads"
              value={platformStats.downloads.toString()}
              subtitle="Archivos descargados"
              color="text-indigo-400"
            />
          </div>
        )}

        {/* All Users Table */}
        {view === 'all' && allUsers.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 overflow-x-auto">
            <h2 className="text-2xl font-bold mb-4">Uso por Usuario</h2>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-700">
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Coste Total</th>
                  <th className="pb-3">Uploads</th>
                  <th className="pb-3">Transcripciones</th>
                  <th className="pb-3">Resúmenes</th>
                  <th className="pb-3">Storage (MB)</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-300">{user.email}</td>
                    <td className="py-3 font-mono text-green-400">
                      {formatCurrency(user.totalCost)}
                    </td>
                    <td className="py-3">{user.uploads}</td>
                    <td className="py-3">{user.transcriptions}</td>
                    <td className="py-3">{user.summaries}</td>
                    <td className="py-3">{user.storageMB.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cost Breakdown */}
        {userStats && view === 'user' && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mt-6">
            <h2 className="text-2xl font-bold mb-4">Desglose de Costes</h2>
            <div className="space-y-3">
              <CostBreakdownItem
                label="Transcripciones Whisper"
                count={userStats.transcriptions}
                costPer={0.00046}
                total={userStats.transcriptions * 0.00046}
              />
              <CostBreakdownItem
                label="Storage"
                count={userStats.storageMB}
                unit="MB"
                costPer={0.023 / 1024}
                total={(userStats.storageMB / 1024) * 0.023}
              />
              <CostBreakdownItem
                label="Resúmenes Claude"
                count={userStats.summaries}
                costPer={0.024}
                total={userStats.summaries * 0.024}
                note="Estimado promedio"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
      <h3 className="text-slate-400 text-sm mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-slate-500 text-sm">{subtitle}</p>
    </div>
  );
}

function CostBreakdownItem({
  label,
  count,
  unit = 'items',
  costPer,
  total,
  note
}: {
  label: string;
  count: number;
  unit?: string;
  costPer: number;
  total: number;
  note?: string;
}) {
  return (
    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
      <div>
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500 text-sm ml-2">
          {count} {unit}
        </span>
        {note && <span className="text-slate-600 text-xs ml-2">({note})</span>}
      </div>
      <div className="text-right">
        <div className="text-green-400 font-mono">
          ${total.toFixed(4)}
        </div>
        <div className="text-slate-500 text-xs">
          ${costPer.toFixed(6)} / {unit}
        </div>
      </div>
    </div>
  );
}
