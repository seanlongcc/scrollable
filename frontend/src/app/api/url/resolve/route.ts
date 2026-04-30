import { NextResponse } from "next/server";

import { resolveUrlSource } from "@/lib/url-source/resolver";
import type { UrlResolverHint } from "@/lib/url-source/types";
import type { YtDlpFailureDiagnostic } from "@/lib/url-source/ytdlp";
import {
  isUrlResolverHint,
  normalizeUrlSourceUrl,
} from "@/lib/url-source/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  const rawHint = requestUrl.searchParams.get("hint") ?? undefined;
  const debugYtDlp = requestUrl.searchParams.get("debug") === "yt-dlp";

  try {
    if (!rawUrl) throw new Error("invalid_url_source_url");
    const url = normalizeUrlSourceUrl(rawUrl);
    if (rawHint && !isUrlResolverHint(rawHint)) {
      throw new Error("invalid_url_resolver_hint");
    }
    const resolverHint: UrlResolverHint | undefined =
      rawHint && isUrlResolverHint(rawHint) ? rawHint : undefined;
    const ytDlpDiagnostics: YtDlpFailureDiagnostic[] = [];

    const source = {
      kind: "url" as const,
      url,
      ...(resolverHint ? { resolverHint } : {}),
    };
    const result = debugYtDlp
      ? await resolveUrlSource(source, { ytDlpDiagnostics })
      : await resolveUrlSource(source);

    return NextResponse.json(
      debugYtDlp
        ? { ...result, diagnostics: { ytDlp: ytDlpDiagnostics } }
        : result,
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invalid_url_source_request";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
