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
});
