'use client';
import { useEffect } from 'react';
import { DEFAULT_LOCALE, registerMessages, setLocale, type Locale } from '../../i18n/config';
import es from '../../i18n/messages/es.json';
import en from '../../i18n/messages/en.json';

export default function I18nProvider({
  children,
  locale
}: { children: React.ReactNode; locale?: Locale }) {
  useEffect(() => {
    registerMessages('es', es as Record<string, string>);
    registerMessages('en', en as Record<string, string>);
    setLocale(locale ?? DEFAULT_LOCALE);
  }, [locale]);

  return <>{children}</>;
}
