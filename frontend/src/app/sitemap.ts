import type { MetadataRoute } from "next";

import { staticSitemapRoutes } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return staticSitemapRoutes();
}
