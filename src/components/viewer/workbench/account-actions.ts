import type { AccountState } from "./types";

export function accountStateFromUser(
  user: { email?: string | null } | null,
): AccountState {
  if (!user) return { status: "signed-out" };

  return {
    status: "signed-in",
    email: user.email ?? "Signed-in account",
  };
}

export type SignOutActionResult =
  | {
      status: "signed-out";
      account: AccountState;
      successMessage: string;
    }
  | {
      status: "unconfigured";
      account: AccountState;
    }
  | {
      status: "error";
      error: string;
    };

export async function signOutAccountAction({
  isConfigured,
  signOut,
}: {
  isConfigured: boolean;
  signOut: () => Promise<{ error?: unknown }>;
}): Promise<SignOutActionResult> {
  if (!isConfigured) {
    return {
      status: "unconfigured",
      account: { status: "unconfigured" },
    };
  }

  try {
    const { error } = await signOut();

    if (error) throw error;

    return {
      status: "signed-out",
      account: { status: "signed-out" },
      successMessage: "Signed out",
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Sign out failed",
    };
  }
}
