import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Anna Logica - Procesamiento IA",
  description: "Procesamiento inteligente de archivos multimedia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${orbitron.variable}`}>
      <body>
        {children}
        <footer className="bg-slate-900 text-slate-400 py-6 px-4 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © 2025 Annalogica. Todos los derechos reservados.
            </p>
            <p className="text-sm">
              soporte@annalogica.eu
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
