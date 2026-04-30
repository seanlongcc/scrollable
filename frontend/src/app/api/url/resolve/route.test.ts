import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveUrlSource } from "@/lib/url-source/resolver";
import { GET } from "./route";

vi.mock("@/lib/url-source/resolver", () => ({
  resolveUrlSource: vi.fn(async () => ({
    resolution: {
      status: "resolved",
      mode: "iframe",
      hint: "iframe",
      title: "Example",
      iframeUrl: "https://example.com/",
      externalUrl: "https://example.com/",
    },
    nextResolverHint: "iframe",
  })),
}));

describe("GET /api/url/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes URL and resolver hint to the URL resolver", async () => {
    const response = await GET(
      new Request(
        "https://scrollable.test/api/url/resolve?url=https%3A%2F%2Fexample.com%2F&hint=metadata",
      ),
    );

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(resolveUrlSource).toHaveBeenCalledWith({
      kind: "url",
      url: "https://example.com/",
      resolverHint: "metadata",
    });
    await expect(response.json()).resolves.toMatchObject({
      resolution: { mode: "iframe" },
      nextResolverHint: "iframe",
    });
  });

  it("rejects non-http URLs before resolving", async () => {
    const response = await GET(
      new Request(
        "https://scrollable.test/api/url/resolve?url=file%3A%2F%2F%2Ftmp%2Fa.png",
      ),
    );

    expect(response.status).toBe(400);
    expect(resolveUrlSource).not.toHaveBeenCalled();
  });

  it("returns sanitized yt-dlp diagnostics when requested", async () => {
    vi.mocked(resolveUrlSource).mockImplementationOnce(
      async (_source, options) => {
        options?.ytDlpDiagnostics?.push({
          event: "yt_dlp_resolution_failed",
          sourceHost: "weverse.io",
          candidate: "yt-dlp",
          reason: "upstream_forbidden",
          detail: "ERROR: HTTP Error 403: Forbidden [url]",
        });

        return {
          resolution: {
            status: "resolved",
            mode: "metadata",
            hint: "metadata",
            title: "Global Fandom Platform - Weverse",
            externalUrl: "https://weverse.io/stayc/live/3-226763714",
            metadata: { title: "Global Fandom Platform - Weverse" },
          },
          nextResolverHint: "metadata",
        };
      },
    );

    const response = await GET(
      new Request(
        "https://scrollable.test/api/url/resolve?url=https%3A%2F%2Fweverse.io%2Fstayc%2Flive%2F3-226763714&debug=yt-dlp",
      ),
    );

    expect(resolveUrlSource).toHaveBeenCalledWith(
      {
        kind: "url",
        url: "https://weverse.io/stayc/live/3-226763714",
      },
      { ytDlpDiagnostics: expect.any(Array) },
    );
    await expect(response.json()).resolves.toMatchObject({
      diagnostics: {
        ytDlp: [
          {
            sourceHost: "weverse.io",
            candidate: "yt-dlp",
            reason: "upstream_forbidden",
          },
        ],
      },
    });
  });
});
