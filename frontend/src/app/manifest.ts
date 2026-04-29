import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrollable",
    short_name: "Scrollable",
    description: "Runtime-only media feed viewer",
    start_url: "/",
    display: "standalone",
    background_color: "#1b151a",
    theme_color: "#ba5963",
    icons: [
      {
        src: "/icon.svg",
        sizes: "128x128",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
