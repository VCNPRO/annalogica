'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, ExternalLink, X } from 'lucide-react';

interface SystemError {
  id: string;
  error_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  user_id: string | null;
  user_email: string | null;
  client_id: number | null;
  user_name: string | null;
  request_url: string | null;
  request_method: string | null;
  sentry_event_id: string | null;
  created_at: string;
  error_age: string;
}

interface ErrorStats {
  error_type: string;
  severity: string;
  count: number;
  last_occurrence: string;
}

// Helper para formatear error_age que puede venir como objeto de Postgres
const formatErrorAge = (errorAge: any): string => {
  // Si ya es string, devolverlo
  if (typeof errorAge === 'string') return errorAge;

  // Si es objeto {seconds, milliseconds} de Postgres
  if (errorAge && typeof errorAge === 'object' && 'seconds' in errorAge) {
    const totalSeconds = Math.floor(errorAge.seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds}s ago`;
    return `${seconds}s ago`;
  }

  return 'unknown';
};

export default function ErrorMonitoringPanel() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [stats, setStats] = useState<ErrorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [resolving, setResolving] = useState(false);

  // Load errors
  const loadErrors = async () => {
    try {
      const res = await fetch('/api/admin/errors?limit=20', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Error loading errors:', error);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/errors?action=stats', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
    loadStats();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadErrors();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Resolve error
  const handleResolve = async (errorId: string, notes?: string) => {
    setResolving(true);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ errorId, resolutionNotes: notes })
      });

      if (res.ok) {
        // Remove from list
        setErrors(prev => prev.filter(e => e.id !== errorId));
        setSelectedError(null);
        alert('✅ Error marcado como resuelto');
      } else {
        alert('❌ Error al resolver');
      }
    } catch (error) {
      console.error('Error resolving:', error);
      alert('❌ Error al resolver');
    } finally {
      setResolving(false);
    }
  };

  // Severity colors
  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-black',
      low: 'bg-blue-500 text-white'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-500';
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                🚨 Monitoreo de Errores
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Errores no resueltos ({errors.length})
              </p>
            </div>
            {stats.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Últimas 24h</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats.reduce((sum, s) => sum + Number(s.count), 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Stats Summary */}
        {stats.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {stats.slice(0, 5).map((stat) => (
                <div
                  key={`${stat.error_type}-${stat.severity}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(stat.severity)}`}
                >
                  {stat.error_type}: {stat.count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">¡No hay errores pendientes!</p>
              <p className="text-sm mt-1">Todo funciona correctamente</p>
            </div>
          ) : (
            errors.map((error) => (
              <div
                key={error.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                onClick={() => setSelectedError(error)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getSeverityColor(error.severity)}`}>
                    {getSeverityIcon(error.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {error.error_type}
                      </span>
                      {error.client_id && (
                        <span className="text-xs font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded">
                          ID {error.client_id}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatErrorAge(error.error_age)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {error.message}
                    </p>
                    {error.request_url && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {error.request_method} {error.request_url}
                      </p>
                    )}
                    {error.user_email && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Usuario: {error.user_email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Detalles del Error
              </h3>
              <button
                onClick={() => setSelectedError(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</label>
                <p className="text-gray-900 dark:text-gray-100">{selectedError.error_type}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Severidad</label>
                <div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedError.severity)}`}>
                    {selectedError.severity.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mensaje</label>
                <p className="text-gray-900 dark:text-gray-100">{selectedError.message}</p>
              </div>

              {selectedError.user_email && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuario Afectado</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedError.user_email}
                    {selectedError.client_id && ` (ID: ${selectedError.client_id})`}
                  </p>
                </div>
              )}

              {selectedError.request_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Request</label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {selectedError.request_method} {selectedError.request_url}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha</label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(selectedError.created_at).toLocaleString('es-ES')} ({formatErrorAge(selectedError.error_age)})
                </p>
              </div>

              {selectedError.sentry_event_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sentry Event</label>
                  <a
                    href={`https://sentry.io/issues/?query=${selectedError.sentry_event_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                  >
                    Ver en Sentry <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setSelectedError(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleResolve(selectedError.id, 'Resuelto desde admin panel')}
                disabled={resolving}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resolving ? 'Resolviendo...' : '✓ Marcar como Resuelto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
