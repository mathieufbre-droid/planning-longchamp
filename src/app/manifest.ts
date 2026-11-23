import type { MetadataRoute } from "next";

/** Rend l'application installable sur l'écran d'accueil du téléphone (icône, plein écran). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Planning Saint François Longchamp",
    short_name: "Longchamp",
    description: "Réservations familiales de l'appartement de Saint François Longchamp",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#ffffff",
    lang: "fr",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
