import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planning Longchamps",
  description: "Réservations familiales de l'appartement de Saint François Longchamps",
  applicationName: "Planning Longchamps",
  appleWebApp: { capable: true, title: "Longchamps", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 font-sans antialiased text-slate-900">{children}</body>
    </html>
  );
}
