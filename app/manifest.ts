import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Borsa Botu",
    short_name: "Borsa Botu",
    description: "BIST canli fiyat ve teknik analiz dashboard",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0e17",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    lang: "tr",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
