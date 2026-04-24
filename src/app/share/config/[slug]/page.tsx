import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSharedConfigMetadata } from "@/lib/data/share";

export const dynamic = "force-dynamic";

export default async function SharedConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shared = await getSharedConfigMetadata(slug);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground">
      <div className="mx-auto grid w-full max-w-xl gap-4">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/">Viewer</Link>
        </Button>
        {shared.status === "ok" ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>{shared.config.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="text-muted-foreground">
                r/{shared.config.subreddit} · {shared.config.sort}/
                {shared.config.time_range}
              </div>
              <div>
                limit {shared.config.limit_count} · skip{" "}
                {shared.config.skip_count} · timer{" "}
                {shared.config.timer_seconds}s
              </div>
              {shared.config.is_nsfw ? (
                <Badge variant="outline" className="w-fit">
                  NSFW
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <GateState status={shared.status} />
        )}
      </div>
    </main>
  );
}

function GateState({ status }: { status: "unconfigured" | "sign-in-required" }) {
  return (
    <Card className="rounded-lg border border-border/60">
      <CardHeader>
        <CardTitle>
          {status === "unconfigured" ? "Supabase env missing" : "Sign-in required"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {status === "unconfigured"
          ? "Configure Supabase before loading shared metadata."
          : "This link is unavailable anonymously or requires sign-in."}
      </CardContent>
    </Card>
  );
}
