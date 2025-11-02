'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Locale = 'es' | 'ca' | 'eu' | 'gl' | 'en' | 'fr' | 'pt' | 'it' | 'de';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  useEffect(() => {
    // Load locale from localStorage on mount
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && savedLocale !== locale) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = async (newLocale: Locale) => {
    try {
      // Save to localStorage
      localStorage.setItem('locale', newLocale);

      // Save to database if user is authenticated
      const res = await fetch('/api/user/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: newLocale })
      });

      if (res.ok) {
        setLocaleState(newLocale);
        // Reload page to apply new language
        router.refresh();
      }
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
