"use client";

import { Globe, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function SignInPanel({ next = "/library" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const isConfigured = Boolean(getSupabaseEnv());

  async function signInWithEmail() {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Check email");
  }

  async function signInWithProvider(provider: "google" | "reddit") {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as never,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) toast.error(error.message);
  }

  return (
    <div className="grid gap-3">
      {!isConfigured ? (
        <p className="text-sm text-muted-foreground">
          Supabase env missing. Runtime feeds still work.
        </p>
      ) : null}
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={!isConfigured}
        />
        <Button
          type="button"
          size="icon"
          onClick={signInWithEmail}
          disabled={!isConfigured || !email}
          aria-label="Email sign in"
        >
          <Mail />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider("google")}
          disabled={!isConfigured}
        >
          <Globe />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider("reddit")}
          disabled={!isConfigured}
        >
          <MessageCircle />
          Reddit
        </Button>
      </div>
    </div>
  );
}
