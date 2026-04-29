import type { UrlRuntimeResolution, UrlSourceConfig } from "./types";
import { parseUrlSourceConfig } from "./validation";
import { resolveDirectMedia } from "./direct-media";
import { resolveProvider } from "./provider-embeds";
import { resolveMetadata } from "./metadata-resolver";
import { resolveIframe } from "./iframe-resolver";
import { resolverNameFromHint } from "./resolver-routing";
import type {
  ResolvedUrlSource,
  ResolverName,
  UrlResolverOptions,
} from "./resolver-types";

export async function resolveUrlSource(
  input: UrlSourceConfig,
  options: UrlResolverOptions = {},
): Promise<ResolvedUrlSource> {
  const source = parseUrlSourceConfig(input);
  const hintedResolver = resolverNameFromHint(source.resolverHint, source);
  const tried = new Set<ResolverName>();

  if (hintedResolver) {
    tried.add(hintedResolver);
    const hinted = await runResolver(hintedResolver, source, options);
    if (hinted?.status === "resolved") return toResolved(hinted);
  }

  for (const resolver of [
    "direct-media",
    "provider",
    "metadata",
    "iframe",
  ] satisfies ResolverName[]) {
    if (tried.has(resolver)) continue;

    const resolution = await runResolver(resolver, source, options);
    if (resolution) return toResolved(resolution);
  }

  return {
    resolution: {
      status: "unsupported",
      title: source.title ?? "Unsupported URL",
      externalUrl: source.url,
      reason: "url_source_unsupported",
    },
  };
}

function toResolved(resolution: UrlRuntimeResolution): ResolvedUrlSource {
  return {
    resolution,
    nextResolverHint:
      resolution.status === "resolved" ? resolution.hint : undefined,
  };
}

async function runResolver(
  resolver: ResolverName,
  source: UrlSourceConfig,
  options: UrlResolverOptions,
) {
  if (resolver === "direct-media") return resolveDirectMedia(source, options);
  if (resolver === "provider") return resolveProvider(source, options);
  if (resolver === "metadata") return resolveMetadata(source, options);
  return resolveIframe(source, options);
}
