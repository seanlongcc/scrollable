import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchPublishedGitHubReleases,
  latestPublishedRelease,
} from "@/lib/releases/github";
import { GET } from "./route";

vi.mock("@/lib/releases/github", () => ({
  fetchPublishedGitHubReleases: vi.fn(),
  latestPublishedRelease: vi.fn(),
}));

describe("GET /api/releases/latest", () => {
  beforeEach(() => {
    vi.mocked(fetchPublishedGitHubReleases).mockReset();
    vi.mocked(latestPublishedRelease).mockReset();
    vi.mocked(latestPublishedRelease).mockImplementation(
      (releases) => releases[0] ?? null,
    );
  });

  it("returns latest release metadata only", async () => {
    const releases = [
      {
        tagName: "v0.2.0",
        name: "Version 0.2.0",
        publishedAt: "2026-05-01T12:00:00Z",
        htmlUrl: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
        body: "Full body is not returned by this endpoint.",
      },
    ];
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases,
    });

    const response = await GET();

    expect(latestPublishedRelease).toHaveBeenCalledWith(releases);
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
