import type { MetadataRoute } from "next";

import { siteDescription, siteName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
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
