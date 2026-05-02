import Link from "next/link";

import { ForgotPasswordPanel } from "@/components/auth/password-reset-panels";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ForgotPasswordPage({
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
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ForgotPasswordPanel next={params.next ?? "/"} />
            <Button asChild variant="outline">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
