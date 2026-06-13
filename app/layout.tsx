import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Borsa Botu | BIST Dashboard",
  description: "BIST canli fiyat ve teknik analiz dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Borsa Botu",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
