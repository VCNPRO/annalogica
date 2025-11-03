import { getRequestConfig } from 'next-intl/server';

export const locales = ['es', 'ca', 'eu', 'gl', 'en', 'fr', 'pt', 'it', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale || 'es';

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default
  };
});
