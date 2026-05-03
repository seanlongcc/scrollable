import type { Metadata } from "next";
import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSharedLayoutMetadata } from "@/lib/data/share";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const sharedPageButtonClass = "font-normal md:font-normal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return createPageMetadata({
    title: "Shared layout",
    description: "Metadata-only shared Scrollable layout link.",
    path: `/share/layout/${encodeURIComponent(slug)}`,
    noIndex: true,
  });
}

export default async function SharedLayoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shared = await getSharedLayoutMetadata(slug);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto grid w-full max-w-xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <SiteLogo className="-ml-2.5" />
          <Button
            asChild
            variant="outline"
            className={`w-fit ${sharedPageButtonClass}`}
          >
            <Link href="/">Viewer</Link>
          </Button>
        </header>
        {shared.status === "ok" ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-sans font-normal">
                  {shared.layout.name}
                </CardTitle>
                <Badge variant="outline">Cloud layout</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-2 rounded-lg border border-border/60 bg-surface/60 p-3 font-mono text-[11px] text-muted-foreground">
                <div>{shared.layout.layout_mode} layout</div>
                <div>
                  {shared.summary.sourceCount} source
                  {shared.summary.sourceCount === 1 ? "" : "s"}
                </div>
                <div>
                  {shared.summary.boxCount} box
                  {shared.summary.boxCount === 1 ? "" : "es"}
                </div>
                <div>
                  reddit {shared.summary.sourceCounts.reddit} · url{" "}
                  {shared.summary.sourceCounts.url} · local{" "}
                  {shared.summary.sourceCounts.local}
                </div>
                <SharedLayoutUrlList sessions={shared.layout.sessions} />
                <div>{formatBytes(shared.layout.metadata_bytes)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className={sharedPageButtonClass}>
                  <Link href={`/?openLayout=${shared.slug}`}>Open now</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className={sharedPageButtonClass}
                >
                  <Link href={`/?importLayout=${shared.slug}`}>Import</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <GateState status={shared.status} />
        )}
      </div>
    </main>
  );
}

function SharedLayoutUrlList({ sessions }: { sessions: unknown }) {
  const sourceGroups = sharedLayoutSourceGroups(sessions);
  const hasUrls = sourceGroups.reddit.length > 0 || sourceGroups.url.length > 0;
  if (!hasUrls && sourceGroups.localFileCount === 0)
    return <div>Sources 0</div>;

  return (
    <div className="grid gap-2">
      <div>Sources</div>
      {sourceGroups.reddit.length ? (
        <SharedLayoutUrlGroup label="Reddit" urls={sourceGroups.reddit} />
      ) : null}
      {sourceGroups.url.length ? (
        <SharedLayoutUrlGroup label="URL" urls={sourceGroups.url} />
      ) : null}
      {sourceGroups.localFileCount ? (
        <div className="grid gap-0.5">
          <div className="font-sans text-xs text-muted-foreground">Local</div>
          <div className="text-foreground">
            {sourceGroups.localFileCount} local{" "}
            {sourceGroups.localFileCount === 1 ? "file" : "files"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SharedLayoutUrlGroup({
  label,
  urls,
}: {
  label: "Reddit" | "URL";
  urls: string[];
}) {
  return (
    <div className="grid gap-0.5">
      <div className="font-sans text-xs text-muted-foreground">{label}</div>
      <div className="grid gap-1">
        {urls.map((url, index) => (
          <a
            key={`${label}-${index}-${url}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-wrap-anywhere rounded-sm text-foreground underline-offset-2 hover:text-secondary hover:underline focus-visible:ring-2 focus-visible:ring-primary"
          >
            {url}
          </a>
        ))}
      </div>
    </div>
  );
}

function sharedLayoutSourceGroups(sessionsJson: unknown) {
  const sessions = Array.isArray(sessionsJson) ? sessionsJson : [];
  return sessions.reduce(
    (groups, session) => {
      if (!isRecord(session)) return groups;
      const sourceConfig = session.sourceConfig;
      if (!isRecord(sourceConfig)) return groups;

      if (sourceConfig.kind === "reddit" && Array.isArray(sourceConfig.urls)) {
        groups.reddit.push(
          ...sourceConfig.urls.filter(
            (url): url is string => typeof url === "string",
          ),
        );
      }

      if (sourceConfig.kind === "url" && typeof sourceConfig.url === "string") {
        groups.url.push(sourceConfig.url);
      }

      if (sourceConfig.kind === "local") {
        groups.localFileCount +=
          typeof sourceConfig.fileCount === "number"
            ? sourceConfig.fileCount
            : 0;
      }

      return groups;
    },
    { reddit: [] as string[], url: [] as string[], localFileCount: 0 },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function GateState({ status }: { status: "unconfigured" | "unavailable" }) {
  return (
    <Card className="rounded-lg border border-border/60">
      <CardHeader>
        <CardTitle>
          {status === "unconfigured"
            ? "Supabase env missing"
            : "Link unavailable"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {status === "unconfigured"
          ? "Configure Supabase before loading shared metadata."
          : "This Cloud layout link is disabled or unavailable."}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  const mib = bytes / 1024 ** 2;
  if (mib >= 1) return `${mib.toFixed(1)} MB`;
  const kib = bytes / 1024;
  if (kib >= 1) return `${kib.toFixed(1)} KB`;
  return `${bytes} B`;
}
