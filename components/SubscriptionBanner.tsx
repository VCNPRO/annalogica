'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, FileText, Calendar } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface SubscriptionBannerProps {
  plan: string;
  filesUsed: number;
  filesTotal: number;
  resetDate: Date | null;
  daysUntilReset: number;
}

export default function SubscriptionBanner({
  plan,
  filesUsed,
  filesTotal,
  resetDate,
  daysUntilReset,
}: SubscriptionBannerProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const percentage = filesTotal > 0 ? Math.round((filesUsed / filesTotal) * 100) : 0;
  const remaining = Math.max(0, filesTotal - filesUsed);

  // Determinar color y estado
  const getStatusColor = () => {
    if (percentage >= 100) return 'from-red-500 to-red-600';
    if (percentage >= 80) return 'from-orange-500 to-orange-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const getBgColor = () => {
    if (percentage >= 100) return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
    if (percentage >= 80) return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
    if (percentage >= 50) return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
    return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
  };

  const formatResetDate = (date: Date | null) => {
    if (!date) return t('subscription.soon');
    const localeMap: Record<string, string> = {
      es: 'es-ES',
      ca: 'ca-ES',
      eu: 'eu-ES',
      gl: 'gl-ES',
      en: 'en-US',
      fr: 'fr-FR',
      pt: 'pt-PT',
      it: 'it-IT',
      de: 'de-DE'
    };
    return new Intl.DateTimeFormat(localeMap[locale] || 'es-ES', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  };

  const getPlanDisplayName = () => {
    const plans: Record<string, string> = {
      free: 'Free',
      basico: 'Básico',
      pro: 'Pro',
      business: 'Business',
      universidad: 'Universidad',
      medios: 'Medios',
      empresarial: 'Empresarial',
    };
    return plans[plan] || plan.toUpperCase();
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  return (
    <div className={`rounded-xl border-2 ${getBgColor()} p-6 mb-6 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('subscription.yourPlan')}: {getPlanDisplayName()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {percentage >= 100
              ? t('subscription.limitReached')
              : t('subscription.filesRemaining', { count: remaining })}
          </p>
        </div>
        {plan !== 'empresarial' && (
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {t('subscription.upgrade')}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <FileText className="h-4 w-4" />
            {t('subscription.filesUsed')}
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {filesUsed} / {filesTotal}
          </span>
        </div>
        <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{percentage}% {t('subscription.used')}</span>
          <span>{remaining > 0 ? t('subscription.available', { count: remaining }) : t('subscription.noFilesAvailable')}</span>
        </div>
      </div>

      {/* Reset Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Calendar className="h-4 w-4" />
        <span>
          {t('subscription.renews')} {formatResetDate(resetDate)}
          {daysUntilReset > 0 && ` (${t('subscription.inDays', { days: daysUntilReset })})`}
        </span>
      </div>
    </div>
  );
}
