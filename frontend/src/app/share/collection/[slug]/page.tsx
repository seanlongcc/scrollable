import type { Metadata } from "next";
import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSharedCollectionMetadata } from "@/lib/data/share";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return createPageMetadata({
    title: "Shared collection",
    description: "Metadata-only shared Scrollable collection link.",
    path: `/share/collection/${encodeURIComponent(slug)}`,
    noIndex: true,
  });
}

export default async function SharedCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shared = await getSharedCollectionMetadata(slug);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <SiteLogo className="-ml-2.5" />
          <Button asChild variant="outline" className="w-fit">
            <Link href="/">Viewer</Link>
          </Button>
        </header>
        {shared.status === "ok" ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>{shared.collection.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="text-muted-foreground">
                {shared.collection.description || "No description"}
              </div>
              {shared.collection.is_nsfw ? (
                <Badge variant="outline" className="w-fit">
                  NSFW
                </Badge>
              ) : null}
              <ul className="grid gap-2">
                {shared.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="font-medium">{item.config?.name}</div>
                    <div className="text-muted-foreground">
                      {item.config?.post_urls.length ?? 0} Reddit source{" "}
                      {item.config?.post_urls.length === 1 ? "link" : "links"}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>
                {shared.status === "unconfigured"
                  ? "Supabase env missing"
                  : "Sign-in required"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {shared.status === "unconfigured"
                ? "Configure Supabase before loading shared metadata."
                : "This link is unavailable anonymously or requires sign-in."}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
