/**
 * Authentication hook
 * Manages user authentication state and verification
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import type { User } from '@/types/user';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Hook for managing authentication
 * Automatically verifies authentication on mount and handles redirects
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (!res.ok) {
        logger.info('Auth check failed, redirecting to login', {
          status: res.status
        });
        router.push('/login');
        return;
      }

      const data = await res.json();
      setUser(data.user);

      // Save non-sensitive user data to localStorage for persistence
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de autenticación';
      logger.error('Auth check error', err);
      setError(errorMessage);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      logger.error('Logout error', err);
    } finally {
      // Clean up local state regardless of API call success
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user,
    loading,
    error,
    logout,
    refreshUser
  };
}
