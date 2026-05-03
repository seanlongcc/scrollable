import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedWorkbench } from "./feed-workbench";

const authMocks = vi.hoisted(() => {
  type MockUser = { id: string; email?: string | null };

  const state: {
    env: { url: string; anonKey: string } | null;
    user: MockUser | null;
    listener:
      | ((event: string, session: { user: MockUser } | null) => void)
      | null;
    cloudError: Error | null;
  } = {
    env: null,
    user: null,
    listener: null,
    cloudError: null,
  };

  return {
    state,
    getUser: vi.fn(async () => ({ data: { user: state.user } })),
    onAuthStateChange: vi.fn(
      (
        callback: (event: string, session: { user: MockUser } | null) => void,
      ) => {
        state.listener = callback;

        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    ),
    signOut: vi.fn(async () => {
      state.user = null;
      state.listener?.("SIGNED_OUT", null);

      return { error: null };
    }),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
  };
});

const toastMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: toastMocks.toast,
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => authMocks.state.env,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: authMocks.getUser,
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut,
      signInWithOAuth: authMocks.signInWithOAuth,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
    from: () => ({
      upsert: vi.fn(async () => ({ error: null })),
      select: () => ({
        order: vi.fn(async () => ({
          data: [],
          error: authMocks.state.cloudError,
        })),
        eq: () => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        }),
      }),
    }),
  }),
}));

describe("FeedWorkbench account state", () => {
  beforeEach(() => {
    authMocks.state.env = null;
    authMocks.state.user = null;
    authMocks.state.listener = null;
    authMocks.state.cloudError = null;
    authMocks.getUser.mockImplementation(async () => ({
      data: { user: authMocks.state.user },
    }));
    authMocks.getUser.mockClear();
    authMocks.onAuthStateChange.mockClear();
    authMocks.signOut.mockClear();
    authMocks.signInWithOAuth.mockClear();
    authMocks.signInWithPassword.mockClear();
    authMocks.signUp.mockClear();
    toastMocks.toast.error.mockClear();
    toastMocks.toast.message.mockClear();
    toastMocks.toast.success.mockClear();
    toastMocks.toast.warning.mockClear();
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
  });

  it("shows the active account and logs out", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };
    authMocks.state.user = {
      id: "user-1",
      email: "reader@example.com",
    };

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    const dialog = await screen.findByRole("dialog", { name: "Account" });
    await waitFor(() =>
      expect(
        within(dialog).getByText("reader@example.com"),
      ).toBeInTheDocument(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Log out" }));

    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Sign in" }),
      ).toBeInTheDocument(),
    );
  });

  it("keeps saved layouts local without an account library link", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));

    expect(
      screen.queryByRole("link", { name: "Account library" }),
    ).not.toBeInTheDocument();
  });

  it("opens a signup auth surface from the signed-out account panel", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    const accountDialog = await screen.findByRole("dialog", {
      name: "Account",
    });
    await waitFor(() =>
      expect(
        within(accountDialog).getByRole("button", { name: "Sign up" }),
      ).toBeInTheDocument(),
    );
    await user.click(
      within(accountDialog).getByRole("button", { name: "Sign up" }),
    );

    const authDialog = await screen.findByRole("dialog", {
      name: "Sign up",
    });
    expect(within(authDialog).getByLabelText("Email")).toBeInTheDocument();
    expect(within(authDialog).getByLabelText("Password")).toBeInTheDocument();
    expect(
      within(authDialog).getByLabelText("Confirm password"),
    ).toBeInTheDocument();
  });

  it("opens a signin auth surface without password confirmation", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    const accountDialog = await screen.findByRole("dialog", {
      name: "Account",
    });
    await waitFor(() =>
      expect(
        within(accountDialog).getByRole("button", { name: "Sign in" }),
      ).toBeInTheDocument(),
    );
    await user.click(
      within(accountDialog).getByRole("button", { name: "Sign in" }),
    );

    const authDialog = await screen.findByRole("dialog", { name: "Sign in" });
    expect(within(authDialog).getByLabelText("Email")).toBeInTheDocument();
    expect(within(authDialog).getByLabelText("Password")).toBeInTheDocument();
    expect(
      within(authDialog).queryByLabelText("Confirm password"),
    ).not.toBeInTheDocument();
  });

  it("does not focus the email field when the signin auth surface opens", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    const accountDialog = await screen.findByRole("dialog", {
      name: "Account",
    });
    await user.click(
      await within(accountDialog).findByRole("button", { name: "Sign in" }),
    );

    const authDialog = await screen.findByRole("dialog", { name: "Sign in" });
    expect(within(authDialog).getByLabelText("Email")).not.toHaveFocus();
  });

  it("does not describe Cloud load failures as signed out when the account is signed in", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };
    authMocks.state.user = {
      id: "user-1",
      email: "reader@example.com",
    };
    authMocks.state.cloudError = new Error("Cloud library load failed");

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Account" }));

    const dialog = await screen.findByRole("dialog", { name: "Account" });
    await waitFor(() =>
      expect(
        within(dialog).getByText(
          "Cloud unavailable: Cloud library load failed",
        ),
      ).toBeInTheDocument(),
    );
    expect(
      within(dialog).queryByText("Sign in to use Cloud"),
    ).not.toBeInTheDocument();
  });

  it("does not describe a missing Cloud session as signed out when the account is signed in", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };
    authMocks.state.user = {
      id: "user-1",
      email: "reader@example.com",
    };
    authMocks.getUser
      .mockResolvedValueOnce({ data: { user: authMocks.state.user } })
      .mockResolvedValueOnce({ data: { user: null } });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(await screen.findByRole("button", { name: "Account" }));

    const dialog = await screen.findByRole("dialog", { name: "Account" });
    await waitFor(() =>
      expect(
        within(dialog).getByText(
          "Cloud unavailable: Cloud session unavailable after sign-in",
        ),
      ).toBeInTheDocument(),
    );
    expect(
      within(dialog).queryByText("Sign in to use Cloud"),
    ).not.toBeInTheDocument();
  });

  it("shows a signed-in confirmation after auth redirect", async () => {
    authMocks.state.env = {
      url: "https://supabase.test",
      anonKey: "anon-key",
    };
    authMocks.state.user = {
      id: "user-1",
      email: "reader@example.com",
    };
    window.history.replaceState(null, "", "/?signedIn=1");

    render(<FeedWorkbench />);

    await waitFor(() =>
      expect(toastMocks.toast.success).toHaveBeenCalledWith("Signed in"),
    );
    expect(window.location.search).not.toContain("signedIn");
  });
});
