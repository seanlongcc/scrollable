import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInPanel } from "./sign-in-panel";

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    anonKey: "publishable-key",
  }),
}));

vi.mock("@/lib/supabase/browser-lazy", () => ({
  createLazySupabaseBrowserClient: async () => ({
    auth: {
      signInWithOAuth: authMocks.signInWithOAuth,
    },
  }),
}));

describe("SignInPanel", () => {
  beforeEach(() => {
    authMocks.signInWithOAuth.mockClear();
    window.history.pushState({}, "", "/login");
  });

  it("offers email account creation without Reddit login", () => {
    render(<SignInPanel next="/" />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Minimum 8 characters"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reddit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Reddit stays a runtime source only, not a login provider.",
      ),
    ).not.toBeInTheDocument();
  });

  it("uses the current origin and an encoded next path for Google redirects", async () => {
    render(<SignInPanel next="/viewer?tab=cloud&mode=grid" />);

    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Fviewer%3Ftab%3Dcloud%26mode%3Dgrid",
      },
    });
  });
});
