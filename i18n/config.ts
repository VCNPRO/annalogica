export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'es';

let currentLocale: Locale = DEFAULT_LOCALE;
const catalogs = new Map<Locale, Record<string, string>>();

export function setLocale(locale: Locale) {
  currentLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function registerMessages(locale: Locale, messages: Record<string, string>) {
  catalogs.set(locale, messages);
}

type TOptions = { locale?: Locale; fallback?: string };

export function t(key: string, opts: TOptions = {}): string {
  const loc = opts.locale ?? currentLocale;
  const dict = catalogs.get(loc) ?? {};
  const val = dict[key];
  if (process.env.NODE_ENV !== 'production' && val === undefined) {
    console.warn(`[i18n] Missing key "${key}" for locale "${loc}"`);
  }
  return val ?? opts.fallback ?? key;
}
