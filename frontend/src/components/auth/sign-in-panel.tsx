"use client";

import { Globe, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function SignInPanel({ next = "/" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isConfigured = Boolean(getSupabaseEnv());
  const canUseEmailPassword =
    isConfigured && email.length > 0 && password.length >= 8;

  async function signInWithEmailPassword() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    window.location.href = withSignedInFlag(next);
  }

  async function signUpWithEmailPassword() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Check email to confirm account");
  }

  async function signInWithGoogle() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) toast.error(error.message);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (canUseEmailPassword) void signInWithEmailPassword();
      }}
    >
      {!isConfigured ? (
        <p className="text-sm text-muted-foreground">
          Supabase env missing. Runtime feeds still work.
        </p>
      ) : null}
      <Label className="grid gap-1 text-sm">
        Email
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={!isConfigured}
        />
      </Label>
      <Label className="grid gap-1 text-sm">
        Password
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          disabled={!isConfigured}
        />
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" disabled={!canUseEmailPassword}>
          <Mail />
          Sign in
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={signUpWithEmailPassword}
          disabled={!canUseEmailPassword}
        >
          <UserPlus />
          Sign up
        </Button>
      </div>
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={signInWithGoogle}
          disabled={!isConfigured}
        >
          <Globe />
          Google
        </Button>
      </div>
    </form>
  );
}

function withSignedInFlag(path: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("signedIn", "1");

  return `${url.pathname}${url.search}${url.hash}`;
}
