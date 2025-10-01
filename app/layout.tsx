import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
