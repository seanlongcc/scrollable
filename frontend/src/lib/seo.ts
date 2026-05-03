import type { Metadata, MetadataRoute } from "next";

export const siteName = "Scrollable";
export const siteDescription =
  "Build multi-view reels-style image and video feeds from Reddit, URLs, and local files.";

const productionUrl = "https://scrollable.app";

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}`;
  noIndex?: boolean;
};

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) return normalizeSiteUrl(configuredUrl);

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) return normalizeSiteUrl(`https://${vercelUrl}`);

  return new URL(productionUrl);
}

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = path;
  const fullTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName,
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${siteName} preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/twitter-image"],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}

export function staticSitemapRoutes(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const routes = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/changelog", changeFrequency: "weekly", priority: 0.7 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  ] as const satisfies readonly {
    path: `/${string}`;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[];

  return routes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(productionUrl);
  }
}
