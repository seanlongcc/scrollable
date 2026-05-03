import { afterEach, describe, expect, it } from "vitest";

import {
  createPageMetadata,
  getSiteUrl,
  siteDescription,
  siteName,
  staticSitemapRoutes,
} from "./seo";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalVercelUrl = process.env.VERCEL_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  process.env.VERCEL_URL = originalVercelUrl;
});

describe("seo helpers", () => {
  it("normalizes configured site URLs for metadataBase", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/path?x=1#hash";
    process.env.VERCEL_URL = "scrollable-preview.vercel.app";

    expect(getSiteUrl().toString()).toBe("https://example.com/");
  });

  it("uses Vercel deployment URLs when no app URL is configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.VERCEL_URL = "scrollable-preview.vercel.app";

    expect(getSiteUrl().toString()).toBe(
      "https://scrollable-preview.vercel.app/",
    );
  });

  it("builds canonical page metadata with social previews", () => {
    const metadata = createPageMetadata({
      title: "Changelog",
      description: "Release history.",
      path: "/changelog",
    });

    expect(metadata.title).toBe("Changelog");
    expect(metadata.description).toBe("Release history.");
    expect(metadata.alternates).toEqual({ canonical: "/changelog" });
    expect(metadata.openGraph).toMatchObject({
      title: `Changelog | ${siteName}`,
      description: "Release history.",
      url: "/changelog",
      siteName,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: `Changelog | ${siteName}`,
      description: "Release history.",
    });
  });

  it("marks private utility pages as noindex", () => {
    const metadata = createPageMetadata({
      title: "Sign in",
      description: "Sign in.",
      path: "/login",
      noIndex: true,
    });

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });

  it("keeps only public static routes in the sitemap", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://scrollable.test";
    process.env.VERCEL_URL = "";

    expect(staticSitemapRoutes()).toEqual([
      {
        url: "https://scrollable.test/",
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://scrollable.test/changelog",
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: "https://scrollable.test/privacy",
        changeFrequency: "yearly",
        priority: 0.4,
      },
      {
        url: "https://scrollable.test/terms",
        changeFrequency: "yearly",
        priority: 0.4,
      },
    ]);
  });

  it("has a specific default description", () => {
    expect(siteDescription).toBe(
      "Build multi-view reels-style image and video feeds from Reddit, URLs, and local files.",
    );
  });
});
