import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GITHUB_RELEASES_URL,
  RELEASES_REVALIDATE_SECONDS,
  fetchPublishedGitHubReleases,
  latestPublishedRelease,
  mapGitHubReleases,
} from "./github";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapGitHubReleases", () => {
  it("filters drafts and prereleases while mapping release metadata", () => {
    const releases = mapGitHubReleases([
      {
        tag_name: "v0.2.0",
        name: "Version 0.2.0",
        published_at: "2026-05-01T12:00:00Z",
        html_url:
          "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
        body: "## Changed\n\n- Added changelog",
        draft: false,
        prerelease: false,
      },
      {
        tag_name: "v0.3.0-beta.1",
        html_url:
          "https://github.com/seanlongcc/scrollable/releases/tag/v0.3.0-beta.1",
        draft: false,
        prerelease: true,
      },
      {
        tag_name: "v0.1.0",
        html_url:
          "https://github.com/seanlongcc/scrollable/releases/tag/v0.1.0",
        draft: true,
        prerelease: false,
      },
    ]);

    expect(releases).toEqual([
      {
        tagName: "v0.2.0",
        name: "Version 0.2.0",
        publishedAt: "2026-05-01T12:00:00Z",
        htmlUrl: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
        body: "## Changed\n\n- Added changelog",
      },
    ]);
  });

  it("falls back to tag name, empty body, and null published date", () => {
    expect(
      mapGitHubReleases([
        {
          tag_name: "v0.2.0",
          name: "",
          published_at: null,
          html_url:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: null,
          draft: false,
          prerelease: false,
        },
      ]),
    ).toEqual([
      {
        tagName: "v0.2.0",
        name: "v0.2.0",
        publishedAt: null,
        htmlUrl: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
        body: "",
      },
    ]);
  });

  it("ignores malformed release records", () => {
    expect(
      mapGitHubReleases([
        { tag_name: "v0.2.0", html_url: "" },
        { tag_name: 123, html_url: "https://github.com/example" },
        null,
      ]),
    ).toEqual([]);
  });
});

describe("latestPublishedRelease", () => {
  it("returns the first release or null", () => {
    expect(latestPublishedRelease([])).toBeNull();
    expect(
      latestPublishedRelease([
        {
          tagName: "v0.2.0",
          name: "v0.2.0",
          publishedAt: null,
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "",
        },
      ]),
    ).toMatchObject({ tagName: "v0.2.0" });
  });
});

describe("fetchPublishedGitHubReleases", () => {
  it("fetches GitHub releases with revalidation", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          tag_name: "v0.2.0",
          name: "Version 0.2.0",
          published_at: "2026-05-01T12:00:00Z",
          html_url:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "Release body",
          draft: false,
          prerelease: false,
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublishedGitHubReleases()).resolves.toEqual({
      status: "ok",
      releases: [
        {
          tagName: "v0.2.0",
          name: "Version 0.2.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "Release body",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      GITHUB_RELEASES_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
        }),
        next: { revalidate: RELEASES_REVALIDATE_SECONDS },
      }),
    );
  });

  it("returns unavailable when GitHub fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
      })),
    );

    await expect(fetchPublishedGitHubReleases()).resolves.toEqual({
      status: "unavailable",
      releases: [],
    });
  });
});
