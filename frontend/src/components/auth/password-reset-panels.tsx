"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { toast } from "@/lib/toast";
import {
  safeNextPath,
  toAuthErrorMessage,
  toForgotPasswordHref,
  toPasswordResetCallbackUrl,
  validateNewPassword,
  withPasswordResetFlag,
} from "./auth-helpers";

const resetSuccessMessage =
  "If this email has an account, we sent a password reset link.";
const authButtonClass = "font-normal md:font-normal";

export function ForgotPasswordPanel({ next = "/" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const isConfigured = Boolean(getSupabaseEnv());
  const canSubmit = isConfigured && email.trim().length > 0;

  async function requestPasswordReset() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: toPasswordResetCallbackUrl(next),
    });

    if (error) {
      toast.error(toAuthErrorMessage(error.message));
      return;
    }

    setEmail("");
    toast.success(resetSuccessMessage);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        void requestPasswordReset();
      }}
    >
      {!isConfigured ? (
        <p className="text-sm text-muted-foreground">
          Supabase env missing. Password reset is unavailable.
        </p>
      ) : null}
      <Label className="grid gap-1 text-sm">
        Email
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={!isConfigured}
        />
      </Label>
      <Button type="submit" disabled={!canSubmit} className={authButtonClass}>
        <Mail />
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordPanel({ next = "/" }: { next?: string }) {
  const [status, setStatus] = useState<"checking" | "ready" | "expired">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const isConfigured = Boolean(getSupabaseEnv());
  const canSubmit =
    isConfigured &&
    status === "ready" &&
    password.length >= 8 &&
    confirmPassword.length > 0;
  const safeNext = safeNextPath(next);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      if (!isConfigured) {
        setStatus("expired");
        return;
      }

      const supabase = await createLazySupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setStatus(user ? "ready" : "expired");
    }

    void checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  async function updatePassword() {
    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error(toAuthErrorMessage(error.message));
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setIsComplete(true);
    toast.success("Password updated.");
  }

  if (!isConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Supabase env missing. Password reset is unavailable.
      </p>
    );
  }

  if (status === "checking") {
    return (
      <p className="text-sm text-muted-foreground">Checking reset link...</p>
    );
  }

  if (status === "expired") {
    return (
      <div className="grid gap-3 text-sm">
        <div className="grid gap-1">
          <p className="font-medium">Reset link expired</p>
          <p className="text-muted-foreground">
            Request a fresh password reset link and open it from the same
            browser.
          </p>
        </div>
        <Button asChild variant="outline" className={authButtonClass}>
          <Link href={toForgotPasswordHref(safeNext)}>Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          Password updated. Continue with the new password.
        </p>
        <Button asChild className={authButtonClass}>
          <Link href={withPasswordResetFlag(safeNext)}>Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        void updatePassword();
      }}
    >
      <Label className="grid gap-1 text-sm">
        New password
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
        />
      </Label>
      <Label className="grid gap-1 text-sm">
        Confirm password
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
        />
      </Label>
      <Button type="submit" disabled={!canSubmit} className={authButtonClass}>
        <KeyRound />
        Update password
      </Button>
    </form>
  );
}
