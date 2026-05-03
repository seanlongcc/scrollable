import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordPanel } from "@/components/auth/password-reset-panels";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Update password",
    description: "Update your Scrollable account password.",
    path: "/reset-password",
    noIndex: true,
  }),
};

export default async function ResetPasswordPage({
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
            <CardTitle>Update password</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ResetPasswordPanel next={params.next ?? "/"} />
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
