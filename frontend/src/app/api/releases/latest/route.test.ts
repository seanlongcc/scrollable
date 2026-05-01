import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublishedGitHubReleases } from "@/lib/releases/github";
import { GET } from "./route";

vi.mock("@/lib/releases/github", () => ({
  fetchPublishedGitHubReleases: vi.fn(),
}));

describe("GET /api/releases/latest", () => {
  beforeEach(() => {
    vi.mocked(fetchPublishedGitHubReleases).mockReset();
  });

  it("returns latest release metadata only", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.2.0",
          name: "Version 0.2.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "Full body is not returned by this endpoint.",
        },
      ],
    });

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=900, stale-while-revalidate=3600",
    );
    await expect(response.json()).resolves.toEqual({
      release: {
        tagName: "v0.2.0",
        htmlUrl: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
      },
    });
  });

  it("returns null when releases are unavailable", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "unavailable",
      releases: [],
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ release: null });
  });
});
