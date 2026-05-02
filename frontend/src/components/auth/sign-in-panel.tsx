"use client";

import { Mail, UserPlus } from "lucide-react";
import Link from "next/link";
import { siGoogle } from "simple-icons";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { toast } from "@/lib/toast";
import {
  toAuthCallbackUrl,
  toAuthErrorMessage,
  toForgotPasswordHref,
  validateNewPassword,
  withSignedInFlag,
} from "./auth-helpers";

const authButtonClass = "font-normal md:font-normal";
const signupSuccessMessage =
  "If this email can create an account, we sent a confirmation link. Already signed up? Sign in or check your inbox.";

type SignInPanelMode = "sign-in" | "sign-up";

function GoogleBrandIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      data-brand-icon="google"
      fill="white"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={siGoogle.path} />
    </svg>
  );
}

export function SignInPanel({
  mode = "sign-in",
  next = "/",
}: {
  mode?: SignInPanelMode;
  next?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const isConfigured = Boolean(getSupabaseEnv());
  const isSigningUp = mode === "sign-up";
  const canUseEmailPassword =
    isConfigured &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    (!isSigningUp || confirmPassword.length > 0);

  async function signInWithEmailPassword() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(toAuthErrorMessage(error.message));
      return;
    }

    window.location.href = withSignedInFlag(next);
  }

  async function signUpWithEmailPassword() {
    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: toAuthCallbackUrl(next),
      },
    });

    if (error) {
      toast.error(toAuthErrorMessage(error.message));
      return;
    }

    setEmail("");
    setPassword("");
    setConfirmPassword("");
    toast.success(signupSuccessMessage);
  }

  async function signInWithGoogle() {
    const supabase = await createLazySupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: toAuthCallbackUrl(next),
      },
    });

    if (error) toast.error(error.message);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canUseEmailPassword) return;
        if (isSigningUp) void signUpWithEmailPassword();
        else void signInWithEmailPassword();
      }}
    >
      {!isConfigured ? (
        <p className="text-sm text-muted-foreground">
          Supabase env missing. Runtime feeds still work.
        </p>
      ) : null}
      <div>
        <Label className="sr-only" htmlFor={emailInputId}>
          Email
        </Label>
        <Input
          id={emailInputId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          autoComplete="email"
          disabled={!isConfigured}
        />
      </div>
      <div>
        <Label className="sr-only" htmlFor={passwordInputId}>
          Password
        </Label>
        <Input
          id={passwordInputId}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          autoComplete={isSigningUp ? "new-password" : "current-password"}
          disabled={!isConfigured}
        />
      </div>
      {isSigningUp ? (
        <div>
          <Label className="sr-only" htmlFor={confirmPasswordInputId}>
            Confirm password
          </Label>
          <Input
            id={confirmPasswordInputId}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="confirm password"
            autoComplete="new-password"
            disabled={!isConfigured}
          />
        </div>
      ) : null}
      {!isSigningUp ? (
        <Link
          className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href={toForgotPasswordHref(next)}
        >
          Forgot password?
        </Link>
      ) : null}
      <div className="grid gap-2">
        <Button
          type="submit"
          disabled={!canUseEmailPassword}
          className={authButtonClass}
        >
          {isSigningUp ? <UserPlus /> : <Mail />}
          {isSigningUp ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={signInWithGoogle}
          disabled={!isConfigured}
          className={authButtonClass}
        >
          <GoogleBrandIcon />
          Google
        </Button>
      </div>
    </form>
  );
}
