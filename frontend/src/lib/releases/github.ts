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
