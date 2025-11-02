import { getRequestConfig } from 'next-intl/server';

export const locales = ['es', 'ca', 'eu', 'gl', 'en', 'fr', 'pt', 'it', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
