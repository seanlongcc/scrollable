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
