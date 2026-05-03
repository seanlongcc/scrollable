import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ForgotPasswordPanel,
  ResetPasswordPanel,
} from "./password-reset-panels";

type MockAuthResult = {
  error: { message: string } | null;
};

type MockGetUserResult = {
  data: { user: { id: string; email: string } | null };
  error: null;
};

const signedInUserResult: MockGetUserResult = {
  data: { user: { id: "user-1", email: "reader@example.com" } },
  error: null,
};

const signedOutUserResult: MockGetUserResult = {
  data: { user: null },
  error: null,
};

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(
    async (): Promise<MockGetUserResult> => ({
      data: { user: { id: "user-1", email: "reader@example.com" } },
      error: null,
    }),
  ),
  resetPasswordForEmail: vi.fn(
    async (): Promise<MockAuthResult> => ({ error: null }),
  ),
  updateUser: vi.fn(async (): Promise<MockAuthResult> => ({ error: null })),
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
      getUser: authMocks.getUser,
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      updateUser: authMocks.updateUser,
    },
  }),
}));

describe("password reset panels", () => {
  beforeEach(() => {
    authMocks.getUser.mockClear();
    authMocks.resetPasswordForEmail.mockClear();
    authMocks.updateUser.mockClear();
    authMocks.getUser.mockResolvedValue(signedInUserResult);
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMocks.updateUser.mockResolvedValue({ error: null });
    toastMocks.toast.error.mockClear();
    toastMocks.toast.success.mockClear();
    window.history.pushState({}, "", "/forgot-password");
  });

  it("requests a password reset email through the auth callback", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPanel next="/viewer?tab=cloud" />);

    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "reader@example.com",
      {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Freset-password%3Fnext%3D%252Fviewer%253Ftab%253Dcloud",
      },
    );
    expect(toastMocks.toast.success).toHaveBeenCalledWith(
      "If this email has an account, we sent a password reset link.",
    );
  });

  it("blocks reset password submit when confirmation does not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPanel />);

    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "Aa123456!");
    await user.type(screen.getByLabelText("Confirm password"), "Aa123456?");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(authMocks.updateUser).not.toHaveBeenCalled();
    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Passwords do not match.",
    );
  });

  it("updates the signed-in recovery user's password", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPanel />);

    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "Aa123456!");
    await user.type(screen.getByLabelText("Confirm password"), "Aa123456!");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(authMocks.updateUser).toHaveBeenCalledWith({
      password: "Aa123456!",
    });
    await waitFor(() =>
      expect(toastMocks.toast.success).toHaveBeenCalledWith(
        "Password updated.",
      ),
    );
  });

  it("shows an expired-link state when no recovery session exists", async () => {
    authMocks.getUser.mockResolvedValue(signedOutUserResult);

    render(<ResetPasswordPanel />);

    expect(await screen.findByText("Reset link expired")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request a new link" }),
    ).toHaveAttribute("href", "/forgot-password?next=%2F");
  });
});
