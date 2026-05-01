import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { SiteLogo } from "@/components/site-logo";
import { fetchPublishedGitHubReleases } from "@/lib/releases/github";

export const metadata: Metadata = {
  title: "Changelog | Scrollable",
  description: "Release history for Scrollable.",
};

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h3 className="text-lg font-semibold tracking-normal text-foreground">
      {children}
    </h3>
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
  li: ({ children }) => <li className="list-disc">{children}</li>,
  a: ({ children, href }) => (
    <a
      className="font-medium text-foreground underline underline-offset-4 hover:text-secondary"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
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
              Follow Scrollable releases, fixes, and product changes published
              from GitHub.
            </p>
          </div>

          {result.status === "unavailable" ? (
            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Release history is temporarily unavailable.
            </p>
          ) : null}

          {result.status === "ok" && result.releases.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              No published releases yet.
            </p>
          ) : null}

          {result.status === "ok" && result.releases.length > 0 ? (
            <section className="grid gap-3">
              {result.releases.map((release, index) => (
                <details
                  className="rounded-lg border border-border bg-card p-4 open:grid open:gap-4"
                  data-testid={`release-${release.tagName}`}
                  key={release.tagName}
                  open={index === 0}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="grid gap-1">
                      <h2 className="text-xl font-semibold tracking-normal">
                        {release.name}
                      </h2>
                      <p className="font-mono text-xs uppercase text-muted-foreground">
                        {formatReleaseDate(release.publishedAt)} -{" "}
                        {release.tagName}
                      </p>
                    </div>
                  </summary>

                  <div className="grid gap-4">
                    {release.body.trim() ? (
                      <ReactMarkdown components={markdownComponents}>
                        {release.body}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                        No release notes provided.
                      </p>
                    )}

                    <a
                      className="w-fit text-sm font-medium text-foreground underline underline-offset-4 hover:text-secondary"
                      href={release.htmlUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View full release
                    </a>
                  </div>
                </details>
              ))}
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}

function formatReleaseDate(publishedAt: string | null) {
  if (!publishedAt) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(publishedAt));
}
