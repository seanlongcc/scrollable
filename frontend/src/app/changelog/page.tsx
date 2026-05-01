import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { SiteLogo } from "@/components/site-logo";
import { fetchPublishedGitHubReleases } from "@/lib/releases/github";

const GITHUB_REPOSITORY_URL = "https://github.com/seanlongcc/scrollable/";
const SAFE_REPOSITORY_RELATIVE_HREF = /^[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

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
  a: ({ children, href }) => {
    const resolvedHref = releaseMarkdownHref(href);

    if (!resolvedHref) return <>{children}</>;

    return (
      <a
        className="font-medium text-foreground underline underline-offset-4 hover:text-secondary"
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
                  className="group rounded-lg border border-border bg-card p-4 open:grid open:gap-4"
                  data-testid={`release-${release.tagName}`}
                  key={release.tagName}
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h2 className="text-xl font-semibold tracking-normal">
                        {release.name}
                      </h2>
                      <p className="font-mono text-xs uppercase text-muted-foreground">
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

                  <div className="grid gap-4">
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
