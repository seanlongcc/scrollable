import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { SiteLogo } from "@/components/site-logo";
import { fetchPublishedGitHubReleases } from "@/lib/releases/github";
import { createPageMetadata } from "@/lib/seo";

const GITHUB_REPOSITORY_URL = "https://github.com/seanlongcc/scrollable/";
const SAFE_REPOSITORY_RELATIVE_HREF = /^[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Changelog",
    description: "Release notes, fixes, and product changes for Scrollable.",
    path: "/changelog",
  }),
};

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h3 className="text-wrap-anywhere text-lg font-semibold tracking-normal text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-wrap-anywhere text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="text-wrap-anywhere grid list-disc gap-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-wrap-anywhere grid list-decimal gap-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-wrap-anywhere">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="text-wrap-anywhere rounded-lg border border-border bg-background/55 px-3 py-2 text-sm leading-6 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="text-wrap-anywhere rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="max-w-full overflow-hidden rounded-lg border border-border bg-background/70 p-3 whitespace-pre-wrap text-wrap-anywhere">
      {children}
    </pre>
  ),
  a: ({ children, href }) => {
    const resolvedHref = releaseMarkdownHref(href);

    if (!resolvedHref) return <>{children}</>;

    return (
      <a
        className="text-wrap-anywhere font-medium text-foreground underline underline-offset-4 hover:text-secondary"
        href={resolvedHref}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  },
};

export default async function ChangelogPage() {
  const result = await fetchPublishedGitHubReleases();

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
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
                  className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 open:grid open:gap-4"
                  data-testid={`release-${release.tagName}`}
                  key={release.tagName}
                  open={index === 0}
                >
                  <summary className="flex min-w-0 cursor-pointer list-none items-start justify-between gap-3">
                    <div className="grid min-w-0 gap-1">
                      <h2 className="text-wrap-anywhere text-xl font-semibold tracking-normal">
                        {release.name}
                      </h2>
                      <p className="text-wrap-anywhere font-mono text-xs uppercase text-muted-foreground">
                        {formatReleaseDate(release.publishedAt)} -{" "}
                        {release.tagName}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                    >
                      <span className="transition-transform group-open:rotate-90">
                        &gt;
                      </span>
                      Details
                    </span>
                  </summary>

                  <div className="grid min-w-0 gap-4 overflow-hidden">
                    {release.body.trim() ? (
                      <ReactMarkdown
                        allowedElements={[
                          "a",
                          "blockquote",
                          "br",
                          "code",
                          "em",
                          "h2",
                          "li",
                          "ol",
                          "p",
                          "pre",
                          "strong",
                          "ul",
                        ]}
                        components={markdownComponents}
                      >
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

function releaseMarkdownHref(href?: string) {
  if (!href) return undefined;

  try {
    const parsedHref = new URL(href);
    if (
      parsedHref.protocol === "http:" ||
      parsedHref.protocol === "https:" ||
      parsedHref.protocol === "mailto:"
    ) {
      return parsedHref.href;
    }

    return undefined;
  } catch {
    if (href.startsWith("//") || href.startsWith("#")) return undefined;

    const isRepositoryRootRelative = href.startsWith("/");
    const repositoryRelativeHref = isRepositoryRootRelative
      ? href.replace(/^\/+/, "")
      : href;

    if (!isSafeRepositoryRelativeHref(repositoryRelativeHref)) {
      return undefined;
    }

    if (
      !isRepositoryRootRelative &&
      !repositoryRelativeHref.includes("/") &&
      !repositoryRelativeHref.includes(".")
    ) {
      return undefined;
    }

    return new URL(repositoryRelativeHref, GITHUB_REPOSITORY_URL).href;
  }
}

function isSafeRepositoryRelativeHref(href: string) {
  return href === "" || SAFE_REPOSITORY_RELATIVE_HREF.test(href);
}
