export const passwordPolicyMessage =
  "Password needs lowercase, uppercase, number, and symbol.";

export const passwordMismatchMessage = "Passwords do not match.";

export function validateNewPassword(password: string, confirmPassword: string) {
  if (password !== confirmPassword) return passwordMismatchMessage;

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
    return passwordPolicyMessage;
  }

  return null;
}

export function toAuthErrorMessage(message: string) {
  if (
    message.includes("Password should contain") ||
    message.includes("Password must contain")
  ) {
    return passwordPolicyMessage;
  }

  return message;
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function toAuthCallbackUrl(next: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", safeNextPath(next));

  return url.toString();
}

export function toPasswordResetCallbackUrl(next: string) {
  const resetPath = new URL("/reset-password", window.location.origin);
  resetPath.searchParams.set("next", safeNextPath(next));

  return toAuthCallbackUrl(`${resetPath.pathname}${resetPath.search}`);
}

export function toForgotPasswordHref(next: string) {
  const params = new URLSearchParams({
    next: safeNextPath(next),
  });

  return `/forgot-password?${params}`;
}

export function withSignedInFlag(path: string) {
  return withQueryFlag(path, "signedIn");
}

export function withPasswordResetFlag(path: string) {
  return withQueryFlag(path, "passwordReset");
}

function withQueryFlag(path: string, key: string) {
  const url = new URL(safeNextPath(path), window.location.origin);
  url.searchParams.set(key, "1");

  return `${url.pathname}${url.search}${url.hash}`;
}
