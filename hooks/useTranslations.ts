'use client';

import { useEffect, useState } from 'react';

type Locale = 'es' | 'ca' | 'eu' | 'gl' | 'en' | 'fr' | 'pt' | 'it' | 'de';

interface Messages {
  [key: string]: any;
}

let cachedMessages: { [locale: string]: Messages } = {};

export function useTranslations() {
  const [locale, setLocale] = useState<Locale>('es');
  const [messages, setMessages] = useState<Messages>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMessages() {
      try {
        // Get locale from localStorage or API
        const savedLocale = localStorage.getItem('locale') as Locale;
        let userLocale: Locale = savedLocale || 'es';

        // Try to get from API if authenticated
        try {
          const res = await fetch('/api/user/language', {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            userLocale = data.language || userLocale;
          }
        } catch (err) {
          // If not authenticated, use localStorage
        }

        setLocale(userLocale);

        // Load messages from cache or import
        if (cachedMessages[userLocale]) {
          setMessages(cachedMessages[userLocale]);
        } else {
          const imported = await import(`@/messages/${userLocale}.json`);
          cachedMessages[userLocale] = imported.default;
          setMessages(imported.default);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to Spanish
        const fallback = await import('@/messages/es.json');
        setMessages(fallback.default);
        setLoading(false);
      }
    }

    loadMessages();
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
    }

    // Replace parameters if provided
    if (params && typeof value === 'string') {
      return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
        return acc.replace(`{${paramKey}}`, String(paramValue));
      }, value);
    }

    return value;
  };

  return { t, locale, loading };
}
