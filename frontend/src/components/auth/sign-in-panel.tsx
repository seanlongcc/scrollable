"use client";

import { Mail, UserPlus } from "lucide-react";
import Link from "next/link";
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
const googleIconPath =
  "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z";

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
      <path d={googleIconPath} />
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
