import Link from "next/link";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="grid w-full max-w-sm gap-6">
        <SiteLogo className="-ml-2.5" />
        <Card className="rounded-lg border border-border/60">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SignInPanel next={params.next ?? "/"} />
            <Button asChild variant="outline">
              <Link href="/">Viewer</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
