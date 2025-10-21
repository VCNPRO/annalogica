// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';               // 👈 importa el CSS global
import I18nProvider from './providers/I18nProvider';

export const metadata: Metadata = {
  title: 'ANNALOGICA',                // 👈 nombre correcto
  description: 'Plataforma ANNALOGICA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale: 'es' | 'en' = 'es';

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
