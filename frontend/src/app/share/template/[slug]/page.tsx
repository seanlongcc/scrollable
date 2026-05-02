import type { Metadata } from "next";
import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSharedTemplateMetadata } from "@/lib/data/share";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return createPageMetadata({
    title: "Shared template",
    description: "Metadata-only shared Scrollable free-layout template link.",
    path: `/share/template/${encodeURIComponent(slug)}`,
    noIndex: true,
  });
}

export default async function SharedTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shared = await getSharedTemplateMetadata(slug);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto grid w-full max-w-xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <SiteLogo className="-ml-2.5" />
          <Button asChild variant="outline" className="w-fit">
            <Link href="/">Viewer</Link>
          </Button>
        </header>
        {shared.status === "ok" ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{shared.template.name}</CardTitle>
                <Badge variant="outline">Cloud template</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-2 rounded-lg border border-border/60 bg-surface/60 p-3 font-mono text-[11px] text-muted-foreground">
                <div>free template</div>
                <div>
                  {shared.summary.boxCount} box
                  {shared.summary.boxCount === 1 ? "" : "es"}
                </div>
                <div>{formatBytes(shared.template.metadata_bytes)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild>
                  <Link href={`/?openTemplate=${shared.slug}`}>Open now</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/?importTemplate=${shared.slug}`}>Import</Link>
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
          : "This Cloud template link is disabled or unavailable."}
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
