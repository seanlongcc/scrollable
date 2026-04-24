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
  } = {
    env: null,
    user: null,
    listener: null,
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
  };
});

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => authMocks.state.env,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: authMocks.getUser,
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut,
    },
    from: () => ({
      upsert: vi.fn(async () => ({ error: null })),
    }),
  }),
}));

describe("FeedWorkbench account state", () => {
  beforeEach(() => {
    authMocks.state.env = null;
    authMocks.state.user = null;
    authMocks.state.listener = null;
    authMocks.getUser.mockClear();
    authMocks.onAuthStateChange.mockClear();
    authMocks.signOut.mockClear();
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

    await user.click(await screen.findByRole("button", { name: "Account" }));

    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(within(dialog).getByText("reader@example.com")).toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: "Open layouts" }));

    expect(
      screen.queryByRole("link", { name: "Account library" }),
    ).not.toBeInTheDocument();
  });
});
