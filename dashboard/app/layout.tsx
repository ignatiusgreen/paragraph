import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paragraph — Dashboard",
  description: "Studio dashboard for Paragraph Films",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon-32.png?v=1", sizes: "32x32" }, { url: "/icon-192.png?v=1", sizes: "192x192" }], apple: "/apple-touch-icon.png?v=1" },
  appleWebApp: { capable: true, title: "Paragraph", statusBarStyle: "black" },
};
export const viewport: Viewport = { themeColor: "#041B21", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
