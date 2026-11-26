import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planning Longchamp",
  description: "Réservations familiales de l'appartement de Saint François Longchamp",
  applicationName: "Planning Longchamp",
  appleWebApp: { capable: true, title: "Longchamp", statusBarStyle: "default" },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 font-sans antialiased text-slate-900">{children}</body>
    </html>
  );
}
