import type { UrlRuntimeResolution, UrlSourceConfig } from "./types";
import type { UrlResolverOptions } from "./resolver-types";
import { titleFromUrl } from "./resolver-title";

export async function resolveIframe(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlRuntimeResolution | null> {
  if (options.allowIframeFallback === false) return null;

  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (fetcher) {
    try {
      const response = await fetcher(source.url, {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok && responseBlocksIframe(response)) {
        return {
          status: "blocked",
          title: source.title ?? titleFromUrl(source.url) ?? "Blocked URL",
          externalUrl: source.url,
          reason: "url_source_frame_blocked",
        };
      }
    } catch {
      // Network/HEAD failures do not prove iframe is blocked.
    }
  }

  return {
    status: "resolved",
    mode: "iframe",
    hint: "iframe",
    title: source.title ?? titleFromUrl(source.url) ?? "URL",
    externalUrl: source.url,
    iframeUrl: source.url,
  };
}

function responseBlocksIframe(response: Response) {
  const xFrameOptions = response.headers.get("x-frame-options")?.toLowerCase();
  if (xFrameOptions === "deny" || xFrameOptions === "sameorigin") return true;

  const csp = response.headers.get("content-security-policy")?.toLowerCase();
  if (!csp) return false;

  const frameAncestors = csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-ancestors"));

  return Boolean(
    frameAncestors &&
    (frameAncestors.includes("'none'") || frameAncestors.includes("'self'")),
  );
}
