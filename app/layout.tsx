// app/layout.tsx
import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import './globals.css';
import I18nProvider from './providers/I18nProvider';
import { ChatWidget } from '@/components/AIAssistant';

// Configurar fuente Orbitron desde Google Fonts
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap', // Mejora la performance
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'annalogica',
  description: 'Transcripción profesional con inteligencia artificial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale: 'es' | 'en' = 'es';
  const showAIAssistant = process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === 'true';

  return (
    <html lang={locale} className={orbitron.variable}>
      <body>
        <I18nProvider locale={locale}>
          {children}
          {showAIAssistant && <ChatWidget />}
        </I18nProvider>
      </body>
    </html>
  );
}
