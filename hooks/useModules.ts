'use client';

import { useState, useEffect, useCallback } from 'react';

interface ServiceModule {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  is_active: boolean;
  user_active?: boolean; // whether the current user has this module
}

export function useModules() {
  const [modules, setModules] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/modules', { credentials: 'include' });
      if (!res.ok) throw new Error('Error fetching modules');
      const data = await res.json();
      setModules(data.modules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const hasModule = useCallback((moduleId: string): boolean => {
    return modules.some(m => m.id === moduleId && m.user_active !== false);
  }, [modules]);

  return { modules, hasModule, loading, error, refresh: fetchModules };
}
