import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInPanel } from "./sign-in-panel";

type MockAuthResult = {
  error: { message: string } | null;
};

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(
    async (): Promise<MockAuthResult> => ({
      error: null,
    }),
  ),
  signInWithPassword: vi.fn(
    async (): Promise<MockAuthResult> => ({
      error: null,
    }),
  ),
  signUp: vi.fn(async (): Promise<MockAuthResult> => ({ error: null })),
}));

const toastMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: toastMocks.toast,
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
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
  }),
}));

describe("SignInPanel", () => {
  beforeEach(() => {
    authMocks.signInWithOAuth.mockClear();
    authMocks.signInWithPassword.mockClear();
    authMocks.signUp.mockClear();
    authMocks.signUp.mockResolvedValue({ error: null });
    toastMocks.toast.error.mockClear();
    toastMocks.toast.success.mockClear();
    window.history.pushState({}, "", "/login");
  });

  it("offers email sign-in without Reddit login", () => {
    render(<SignInPanel next="/" />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign up" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Minimum 8 characters"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
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

  it("shows password confirmation only when creating an account", () => {
    render(<SignInPanel mode="sign-up" next="/" />);

    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("blocks signup when password confirmation does not match", async () => {
    const user = userEvent.setup();
    render(<SignInPanel mode="sign-up" next="/" />);

    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(screen.getByLabelText("Password"), "Aa123456!");
    await user.type(screen.getByLabelText("Confirm password"), "Aa123456?");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Passwords do not match.",
    );
  });

  it("uses concise local copy for weak signup passwords", async () => {
    const user = userEvent.setup();
    render(<SignInPanel mode="sign-up" next="/" />);

    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.type(screen.getByLabelText("Confirm password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Password needs lowercase, uppercase, number, and symbol.",
    );
  });

  it("maps Supabase password policy errors to concise copy", async () => {
    const user = userEvent.setup();
    authMocks.signUp.mockResolvedValue({
      error: {
        message:
          "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()",
      },
    });
    render(<SignInPanel mode="sign-up" next="/" />);

    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(screen.getByLabelText("Password"), "Aa123456!");
    await user.type(screen.getByLabelText("Confirm password"), "Aa123456!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Password needs lowercase, uppercase, number, and symbol.",
    );
  });

  it("clears signup fields after signup succeeds", async () => {
    const user = userEvent.setup();
    render(<SignInPanel mode="sign-up" next="/" />);

    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(screen.getByLabelText("Password"), "Aa123456!");
    await user.type(screen.getByLabelText("Confirm password"), "Aa123456!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "reader@example.com",
      password: "Aa123456!",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2F",
      },
    });
    expect(toastMocks.toast.success).toHaveBeenCalledWith(
      "If this email can create an account, we sent a confirmation link. Already signed up? Sign in or check your inbox.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
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
