// app/layout.tsx
import type { Metadata } from 'next';
import I18nProvider from './providers/I18nProvider';

export const metadata: Metadata = {
  title: 'anna-codice',
  description: 'Plataforma anna-codice',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Por ahora fijamos el idioma manualmente.
  // Más adelante lo podremos detectar por URL o cabeceras.
  const locale: 'es' | 'en' = 'es';

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
