'use client';

import { useRouter } from 'next/navigation';
import { X, AlertCircle, TrendingUp } from 'lucide-react';

interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'files' | 'hours';
  used: number;
  total: number;
  resetDate: Date | null;
  currentPlan: string;
}

export default function QuotaExceededModal({
  isOpen,
  onClose,
  type,
  used,
  total,
  resetDate,
  currentPlan,
}: QuotaExceededModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const formatResetDate = (date: Date | null) => {
    if (!date) return 'próximamente';
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const getTitle = () => {
    if (type === 'files') return 'Límite de archivos alcanzado';
    return 'Horas de transcripción agotadas';
  };

  const getDescription = () => {
    if (type === 'files') {
      return `Has procesado todos los archivos de tu plan ${currentPlan.toUpperCase()} este mes.`;
    }
    return `Has usado todas las horas de transcripción de tu plan ${currentPlan.toUpperCase()} este mes.`;
  };

  const getUnit = () => {
    if (type === 'files') return 'archivos';
    return 'horas';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {getTitle()}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getDescription()}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Usage Stats */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uso actual
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {used} / {total}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-full" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                100% de {total} {getUnit()} usados
              </p>
            </div>

            {/* Reset Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Tu cuota se renovará el:</span>
                <br />
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {formatResetDate(resetDate)}
                </span>
              </p>
            </div>

            {/* Suggestion */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  ¿Necesitas más {getUnit()} ahora?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Mejora tu plan para obtener acceso inmediato a más recursos y funcionalidades avanzadas.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Mejorar Plan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
