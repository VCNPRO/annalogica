/**
 * Subscription hook
 * Manages subscription data and quota information
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { SubscriptionData } from '@/types/user';

export interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing subscription data
 * Fetches and maintains subscription status
 */
export function useSubscription(enabled: boolean = true): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/subscription/status', {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch subscription: ${res.status}`);
      }

      const data = await res.json();

      setSubscription({
        plan: data.plan,
        filesUsed: data.usage,
        filesTotal: data.quota,
        resetDate: data.resetDate ? new Date(data.resetDate) : null,
        daysUntilReset: data.stats?.daysUntilReset || 0
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar suscripción';
      logger.error('Subscription fetch error', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchSubscription();
  };

  useEffect(() => {
    fetchSubscription();
  }, [enabled]);

  return {
    subscription,
    loading,
    error,
    refresh
  };
}
