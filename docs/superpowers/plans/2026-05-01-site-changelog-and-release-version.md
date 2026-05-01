# Site Changelog and Release Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/changelog` page and legal/footer release links sourced from published GitHub Releases.

**Architecture:** GitHub Releases are fetched server-side through a focused release helper with 900-second revalidation. `/changelog` renders the full GitHub release body as Markdown, while client footers read a small latest-release API route for `vX.Y.Z` link metadata. Release data stays metadata-only and is never persisted.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, `react-markdown`, GitHub REST Releases API.

---

## Spec And Guardrails

- Spec: `docs/superpowers/specs/2026-05-01-site-changelog-and-release-version-design.md`
- ADR: `docs/adr/0001-manual-github-release-automation.md`
- Context glossary: `CONTEXT.md`
- Brooks-Lint risk: knowledge duplication. Keep GitHub release normalization in one helper and legal/footer version display in one component instead of repeating fetch and mapping logic.
- Run npm commands from repo root after `nvm use 24`.

## File Structure

- Create `frontend/src/lib/releases/github.ts`: GitHub Releases fetch, mapping, filtering, latest selection.
- Create `frontend/src/lib/releases/github.test.ts`: focused mapper/fetch tests.
- Create `frontend/src/app/api/releases/latest/route.ts`: metadata-only latest release API.
- Create `frontend/src/app/api/releases/latest/route.test.ts`: API response tests.
- Create `frontend/src/components/release-version-link.tsx`: client component that hides when latest release metadata is unavailable.
- Create `frontend/src/components/release-version-link.test.tsx`: component fetch success/failure tests.
- Create `frontend/src/app/changelog/page.tsx`: server-rendered changelog page.
- Create `frontend/src/app/changelog/page.test.tsx`: populated, empty, and unavailable page tests.
- Modify `frontend/package.json` and `package-lock.json`: add `react-markdown`.
- Modify `frontend/src/components/viewer/workbench/workbench-panel.tsx`: add `Changelog` and version link in desktop footer.
- Modify `frontend/src/components/viewer/workbench/account-dialog.tsx`: add `Changelog` and version link in account footer.
- Modify `frontend/src/app/legal-page.tsx`: add `Changelog` to legal page nav.
- Modify tests in `frontend/src/components/viewer/workbench/workbench-chrome.test.tsx`, `frontend/src/components/viewer/workbench/cloud-save-ui.test.tsx`, and `frontend/src/app/legal-page.test.tsx`.

## Task 1: GitHub Release Helper

**Files:**
- Create: `frontend/src/lib/releases/github.ts`
- Create: `frontend/src/lib/releases/github.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `frontend/src/lib/releases/github.test.ts`:

```ts
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
        html_url: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
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
        html_url: "https://github.com/seanlongcc/scrollable/releases/tag/v0.1.0",
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
          htmlUrl: "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/lib/releases/github.test.ts
```

Expected: FAIL because `frontend/src/lib/releases/github.ts` does not exist.

- [ ] **Step 3: Implement release helper**

Create `frontend/src/lib/releases/github.ts`:

```ts
export const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/seanlongcc/scrollable/releases";

export const RELEASES_REVALIDATE_SECONDS = 900;

export type PublishedGitHubRelease = {
  tagName: string;
  name: string;
  publishedAt: string | null;
  htmlUrl: string;
  body: string;
};

type GitHubReleaseApiRecord = {
  tag_name?: unknown;
  name?: unknown;
  published_at?: unknown;
  html_url?: unknown;
  body?: unknown;
  draft?: unknown;
  prerelease?: unknown;
};

export type ReleaseFetchResult =
  | { status: "ok"; releases: PublishedGitHubRelease[] }
  | { status: "unavailable"; releases: [] };

export function mapGitHubReleases(input: unknown): PublishedGitHubRelease[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => {
    const release = mapGitHubRelease(entry);
    return release ? [release] : [];
  });
}

export function latestPublishedRelease(
  releases: PublishedGitHubRelease[],
): PublishedGitHubRelease | null {
  return releases[0] ?? null;
}

export async function fetchPublishedGitHubReleases(): Promise<ReleaseFetchResult> {
  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: RELEASES_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return { status: "unavailable", releases: [] };
    }

    return { status: "ok", releases: mapGitHubReleases(await response.json()) };
  } catch {
    return { status: "unavailable", releases: [] };
  }
}

function mapGitHubRelease(input: unknown): PublishedGitHubRelease | null {
  if (!isGitHubReleaseRecord(input)) return null;
  if (input.draft === true || input.prerelease === true) return null;

  const tagName = stringValue(input.tag_name);
  const htmlUrl = stringValue(input.html_url);
  if (!tagName || !htmlUrl) return null;

  return {
    tagName,
    name: stringValue(input.name) || tagName,
    publishedAt: stringValue(input.published_at) || null,
    htmlUrl,
    body: stringValue(input.body) ?? "",
  };
}

function isGitHubReleaseRecord(
  input: unknown,
): input is GitHubReleaseApiRecord {
  return typeof input === "object" && input !== null;
}

function stringValue(input: unknown) {
  return typeof input === "string" ? input : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/lib/releases/github.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/releases/github.ts frontend/src/lib/releases/github.test.ts
git commit -m "feat: add github release metadata helper"
```

## Task 2: Latest Release API

**Files:**
- Create: `frontend/src/app/api/releases/latest/route.ts`
- Create: `frontend/src/app/api/releases/latest/route.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `frontend/src/app/api/releases/latest/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/app/api/releases/latest/route.test.ts
```

Expected: FAIL because route file does not exist.

- [ ] **Step 3: Implement latest release API route**

Create `frontend/src/app/api/releases/latest/route.ts`:

```ts
import {
  fetchPublishedGitHubReleases,
  latestPublishedRelease,
} from "@/lib/releases/github";

const CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=3600";

export async function GET() {
  const result = await fetchPublishedGitHubReleases();
  const latest =
    result.status === "ok" ? latestPublishedRelease(result.releases) : null;

  return Response.json(
    {
      release: latest
        ? { tagName: latest.tagName, htmlUrl: latest.htmlUrl }
        : null,
    },
    {
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/app/api/releases/latest/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/releases/latest/route.ts frontend/src/app/api/releases/latest/route.test.ts
git commit -m "feat: expose latest release metadata"
```

## Task 3: Release Version Link Component

**Files:**
- Create: `frontend/src/components/release-version-link.tsx`
- Create: `frontend/src/components/release-version-link.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `frontend/src/components/release-version-link.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReleaseVersionLink } from "./release-version-link";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReleaseVersionLink", () => {
  it("links the latest version to the GitHub release", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          release: {
            tagName: "v0.2.0",
            htmlUrl:
              "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          },
        }),
      })),
    );

    render(<ReleaseVersionLink className="test-class" />);

    const link = await screen.findByRole("link", { name: "v0.2.0" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveClass("test-class");
  });

  it("renders nothing when latest release is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ release: null }),
      })),
    );

    const { container } = render(<ReleaseVersionLink />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/releases/latest"));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network failed");
      }),
    );

    const { container } = render(<ReleaseVersionLink />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/releases/latest"));
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/components/release-version-link.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement component**

Create `frontend/src/components/release-version-link.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type LatestReleaseResponse = {
  release: {
    tagName: string;
    htmlUrl: string;
  } | null;
};

type ReleaseVersionLinkProps = {
  className?: string;
};

export function ReleaseVersionLink({ className }: ReleaseVersionLinkProps) {
  const [release, setRelease] =
    useState<LatestReleaseResponse["release"]>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLatestRelease() {
      try {
        const response = await fetch("/api/releases/latest");
        if (!response.ok) return;

        const payload = (await response.json()) as LatestReleaseResponse;
        if (isMounted) {
          setRelease(validRelease(payload.release) ? payload.release : null);
        }
      } catch {
        if (isMounted) setRelease(null);
      }
    }

    void loadLatestRelease();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!release) return null;

  return (
    <a
      className={className}
      href={release.htmlUrl}
      rel="noreferrer"
      target="_blank"
    >
      {release.tagName}
    </a>
  );
}

function validRelease(
  release: LatestReleaseResponse["release"],
): release is NonNullable<LatestReleaseResponse["release"]> {
  return (
    typeof release?.tagName === "string" &&
    release.tagName.length > 0 &&
    typeof release.htmlUrl === "string" &&
    release.htmlUrl.length > 0
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/components/release-version-link.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/release-version-link.tsx frontend/src/components/release-version-link.test.tsx
git commit -m "feat: add release version link"
```

## Task 4: Changelog Page

**Files:**
- Modify: `frontend/package.json`
- Modify: `package-lock.json`
- Create: `frontend/src/app/changelog/page.tsx`
- Create: `frontend/src/app/changelog/page.test.tsx`

- [ ] **Step 1: Add Markdown dependency**

Run:

```bash
nvm use 24
npm install --workspace frontend react-markdown
```

Expected: `frontend/package.json` and root `package-lock.json` update with `react-markdown`.

- [ ] **Step 2: Write failing changelog page tests**

Create `frontend/src/app/changelog/page.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublishedGitHubReleases } from "@/lib/releases/github";
import ChangelogPage from "./page";

vi.mock("@/lib/releases/github", () => ({
  fetchPublishedGitHubReleases: vi.fn(),
}));

describe("ChangelogPage", () => {
  beforeEach(() => {
    vi.mocked(fetchPublishedGitHubReleases).mockReset();
  });

  it("renders latest release expanded and older releases collapsed", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [
        {
          tagName: "v0.2.0",
          name: "Version 0.2.0",
          publishedAt: "2026-05-01T12:00:00Z",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
          body: "## Changed\n\n- Added site changelog",
        },
        {
          tagName: "v0.1.0",
          name: "Initial release",
          publishedAt: null,
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.1.0",
          body: "",
        },
      ],
    });

    render(await ChangelogPage());

    expect(
      screen.getByRole("heading", { name: "Changelog" }),
    ).toBeInTheDocument();
    const latest = screen.getByTestId("release-v0.2.0");
    expect(latest).toHaveAttribute("open");
    expect(
      within(latest).getByRole("heading", { name: "Changed" }),
    ).toBeInTheDocument();
    expect(within(latest).getByText("Added site changelog")).toBeInTheDocument();
    expect(
      within(latest).getByRole("link", { name: "View full release" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
    );

    const older = screen.getByTestId("release-v0.1.0");
    expect(older).not.toHaveAttribute("open");
    expect(
      within(older).getByText("No release notes provided."),
    ).toBeInTheDocument();
  });

  it("renders an empty state when no releases exist", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "ok",
      releases: [],
    });

    render(await ChangelogPage());

    expect(screen.getByText("No published releases yet.")).toBeInTheDocument();
  });

  it("renders an unavailable state when GitHub fetch fails", async () => {
    vi.mocked(fetchPublishedGitHubReleases).mockResolvedValue({
      status: "unavailable",
      releases: [],
    });

    render(await ChangelogPage());

    expect(
      screen.getByText("Release history is temporarily unavailable."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/app/changelog/page.test.tsx
```

Expected: FAIL because page file does not exist.

- [ ] **Step 4: Implement changelog page**

Create `frontend/src/app/changelog/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { SiteLogo } from "@/components/site-logo";
import { fetchPublishedGitHubReleases } from "@/lib/releases/github";

export const metadata: Metadata = {
  title: "Changelog | Scrollable",
  description: "Release history for Scrollable.",
};

export default async function ChangelogPage() {
  const result = await fetchPublishedGitHubReleases();

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo className="-ml-2.5" />
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
          </nav>
        </header>

        <article className="grid gap-7">
          <div className="grid gap-3 border-b border-border pb-6">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              GitHub Releases
            </p>
            <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">
              Changelog
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Published production checkpoints for Scrollable, sourced from
              GitHub Releases.
            </p>
          </div>

          {result.status === "unavailable" ? (
            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Release history is temporarily unavailable.
            </p>
          ) : result.releases.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              No published releases yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {result.releases.map((release, index) => (
                <details
                  className="group rounded-lg border border-border/70 bg-card/30 p-4"
                  data-testid={`release-${release.tagName}`}
                  key={release.tagName}
                  open={index === 0}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-xl font-semibold tracking-normal">
                        {release.name}
                      </h2>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatReleaseDate(release.publishedAt)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {release.tagName}
                    </p>
                  </summary>
                  <div className="mt-4 grid gap-4 border-t border-border/60 pt-4">
                    {release.body.trim() ? (
                      <ReactMarkdown
                        components={{
                          a: ({ children, href }) => (
                            <a
                              className="text-foreground underline underline-offset-4 hover:text-primary"
                              href={href}
                              rel="noreferrer"
                              target={href?.startsWith("http") ? "_blank" : undefined}
                            >
                              {children}
                            </a>
                          ),
                          h2: ({ children }) => (
                            <h3 className="text-lg font-semibold tracking-normal">
                              {children}
                            </h3>
                          ),
                          li: ({ children }) => (
                            <li className="list-disc">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="grid gap-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                              {children}
                            </ul>
                          ),
                        }}
                      >
                        {release.body}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                        No release notes provided.
                      </p>
                    )}
                    <a
                      className="w-fit font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      href={release.htmlUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View full release
                    </a>
                  </div>
                </details>
              ))}
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

function formatReleaseDate(value: string | null) {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/app/changelog/page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json package-lock.json frontend/src/app/changelog/page.tsx frontend/src/app/changelog/page.test.tsx
git commit -m "feat: add changelog page"
```

## Task 5: Legal And Footer Links

**Files:**
- Modify: `frontend/src/components/viewer/workbench/workbench-panel.tsx`
- Modify: `frontend/src/components/viewer/workbench/account-dialog.tsx`
- Modify: `frontend/src/app/legal-page.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-chrome.test.tsx`
- Modify: `frontend/src/components/viewer/workbench/cloud-save-ui.test.tsx`
- Modify: `frontend/src/app/legal-page.test.tsx`

- [ ] **Step 1: Update failing UI tests**

In `frontend/src/components/viewer/workbench/workbench-chrome.test.tsx`, update the legal footer test so it checks all links:

```tsx
  it("shows legal and release links at the bottom of the desktop workbench panel", async () => {
    render(<WorkbenchChrome {...chromeProps()} />);

    const panel = screen.getByLabelText("Workbench contextual panel");

    expect(
      await within(panel).findByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(within(panel).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(panel).getByRole("link", { name: "Changelog" }),
    ).toHaveAttribute("href", "/changelog");
  });
```

In `frontend/src/components/viewer/workbench/cloud-save-ui.test.tsx`, update the account dialog legal test:

```tsx
  it("shows legal and release links in the account dialog", () => {
    render(
      <AccountDialog
        open
        onOpenChange={vi.fn()}
        account={signedInAccount()}
        localCacheStatus={{ label: "Local cache: storage usage unavailable" }}
        cloudUsage={cloudUsage({ usedBytes: 2048 })}
        onRefreshLocalCacheStatus={vi.fn()}
        onClearLocalCache={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Account" });

    expect(
      within(dialog).getByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(within(dialog).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(dialog).getByRole("link", { name: "Changelog" }),
    ).toHaveAttribute("href", "/changelog");
  });
```

In `frontend/src/app/legal-page.test.tsx`, add the nav assertion:

```tsx
  it("links to changelog from legal page navigation", () => {
    render(
      <LegalPage
        title="Terms of Service"
        updatedAt="April 30, 2026"
        intro={["Intro paragraph."]}
        sections={[{ title: "Section", paragraphs: ["Section paragraph."] }]}
      />,
    );

    expect(screen.getByRole("link", { name: "Changelog" })).toHaveAttribute(
      "href",
      "/changelog",
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/components/viewer/workbench/workbench-chrome.test.tsx src/components/viewer/workbench/cloud-save-ui.test.tsx src/app/legal-page.test.tsx
```

Expected: FAIL because `Changelog` links are not rendered yet.

- [ ] **Step 3: Update UI links**

In `frontend/src/components/viewer/workbench/workbench-panel.tsx`, import `ReleaseVersionLink`:

```tsx
import { ReleaseVersionLink } from "@/components/release-version-link";
```

Replace `WorkbenchLegalFooter` with:

```tsx
function WorkbenchLegalFooter() {
  const linkClass = "hover:text-foreground";

  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
      <Link className={linkClass} href="/privacy">
        Privacy
      </Link>
      <Link className={linkClass} href="/terms">
        Terms
      </Link>
      <Link className={linkClass} href="/changelog">
        Changelog
      </Link>
      <ReleaseVersionLink className={linkClass} />
    </footer>
  );
}
```

In `frontend/src/components/viewer/workbench/account-dialog.tsx`, import `ReleaseVersionLink`:

```tsx
import { ReleaseVersionLink } from "@/components/release-version-link";
```

Replace the dialog footer with:

```tsx
        <footer className={accountLegalFooterClass}>
          <Link className="hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-foreground" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-foreground" href="/changelog">
            Changelog
          </Link>
          <ReleaseVersionLink className="hover:text-foreground" />
        </footer>
```

In `frontend/src/app/legal-page.tsx`, update nav:

```tsx
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" href="/changelog">
              Changelog
            </Link>
          </nav>
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/components/viewer/workbench/workbench-chrome.test.tsx src/components/viewer/workbench/cloud-save-ui.test.tsx src/app/legal-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/viewer/workbench/workbench-panel.tsx frontend/src/components/viewer/workbench/account-dialog.tsx frontend/src/app/legal-page.tsx frontend/src/components/viewer/workbench/workbench-chrome.test.tsx frontend/src/components/viewer/workbench/cloud-save-ui.test.tsx frontend/src/app/legal-page.test.tsx
git commit -m "feat: show changelog in legal links"
```

## Task 6: Integration Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
nvm use 24
npm --workspace frontend exec -- vitest run src/lib/releases/github.test.ts src/app/api/releases/latest/route.test.ts src/components/release-version-link.test.tsx src/app/changelog/page.test.tsx src/components/viewer/workbench/workbench-chrome.test.tsx src/components/viewer/workbench/cloud-save-ui.test.tsx src/app/legal-page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run formatting check**

Run:

```bash
nvm use 24
npm run format:check
```

Expected: PASS. If it fails, run `nvm use 24 && npm run format`, inspect the diff, then rerun `format:check`.

- [ ] **Step 3: Run lint, typecheck, and unit tests**

Run:

```bash
nvm use 24
npm run lint
npm run typecheck
npm test
```

Expected: all PASS.

- [ ] **Step 4: Run build**

Run:

```bash
nvm use 24
npm run build
```

Expected: PASS.

- [ ] **Step 5: Browser verification**

Run the dev server:

```bash
nvm use 24
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Verify in browser:

- Desktop `/`: workbench footer wraps cleanly and shows `Privacy`, `Terms`, `Changelog`; version appears if GitHub latest release loads.
- Desktop `/changelog`: page loads; populated, empty, or unavailable state is legible.
- Mobile `/changelog`: no horizontal overflow; release summaries and body text wrap cleanly.
- Account dialog: legal footer wraps cleanly with `Changelog`.

If browser dependencies fail in WSL, record exact missing shared library and do not claim browser verification passed.

- [ ] **Step 6: Check git status**

Run:

```bash
git status --short --branch
```

Expected: only intended changes remain, or clean after final commit.

- [ ] **Step 7: Final commit if verification changed files**

If formatting changed files after Task 5, commit them:

```bash
git add frontend package-lock.json
git commit -m "chore: format changelog release links"
```
