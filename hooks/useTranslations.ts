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
        // Cargar INMEDIATAMENTE desde localStorage (no bloquear)
        const savedLocale = (localStorage.getItem('locale') as Locale) || 'es';
        setLocale(savedLocale);

        // Load messages from cache or import - PRIORITARIO
        if (cachedMessages[savedLocale]) {
          setMessages(cachedMessages[savedLocale]);
          setLoading(false);
        } else {
          const imported = await import(`@/messages/${savedLocale}.json`);
          cachedMessages[savedLocale] = imported.default;
          setMessages(imported.default);
          setLoading(false);
        }

        // Sync with API in background (NO BLOQUEAR)
        fetch('/api/user/language', {
          credentials: 'include'
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.language && data.language !== savedLocale) {
              // Si el idioma de BD es diferente, actualizar
              localStorage.setItem('locale', data.language);
              setLocale(data.language);

              if (cachedMessages[data.language]) {
                setMessages(cachedMessages[data.language]);
              } else {
                import(`@/messages/${data.language}.json`).then(imported => {
                  cachedMessages[data.language] = imported.default;
                  setMessages(imported.default);
                });
              }
            }
          })
          .catch(() => {}); // Silently fail - ya tenemos localStorage

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
