import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { isPublicTenantServer } from "@/utils/tenant-server";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#4F46E5',
};

export const metadata: Metadata = {
  title: "LedgerXpertz - Sistema de Facturación Electrónica",
  description: "Sistema multi-tenant de facturación electrónica integrado con SRI Ecuador",
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detectar tenant en el servidor - esto se ejecuta ANTES de renderizar
  const isPublic = await isPublicTenantServer();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers isPublic={isPublic}>{children}</Providers>
      </body>
    </html>
  );
}
