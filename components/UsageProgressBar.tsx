'use client';

interface UsageProgressBarProps {
  used: number;
  total: number;
  label: string;
  unit?: string;
  showPercentage?: boolean;
}

export default function UsageProgressBar({
  used,
  total,
  label,
  unit = '',
  showPercentage = true,
}: UsageProgressBarProps) {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const remaining = Math.max(0, total - used);

  // Determinar color según el porcentaje usado
  const getColorClass = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBackgroundColor = () => {
    if (percentage >= 100) return 'bg-red-50 dark:bg-red-900/10';
    if (percentage >= 80) return 'bg-orange-50 dark:bg-orange-900/10';
    if (percentage >= 50) return 'bg-yellow-50 dark:bg-yellow-900/10';
    return 'bg-green-50 dark:bg-green-900/10';
  };

  const getTextColor = () => {
    if (percentage >= 100) return 'text-red-700 dark:text-red-400';
    if (percentage >= 80) return 'text-orange-700 dark:text-orange-400';
    if (percentage >= 50) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-green-700 dark:text-green-400';
  };

  return (
    <div className={`rounded-lg p-4 ${getBackgroundColor()}`}>
      {/* Label y estadísticas */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {used} / {total} {unit}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass()} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Información adicional */}
      <div className="flex items-center justify-between mt-2">
        {showPercentage && (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {percentage}% usado
          </span>
        )}
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {remaining > 0 ? `${remaining} ${unit} disponibles` : 'Límite alcanzado'}
        </span>
      </div>
    </div>
  );
}
