import { createHash } from "node:crypto";

export function pathJoin(...parts: string[]) {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

export function absoluteUrl(value: string, base: URL) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export function parentUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/");
    segments.pop();
    url.pathname = ensureTrailingSlash(segments.join("/"));
    return url.toString();
  } catch {
    return null;
  }
}

export function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function normalizedHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return isHttpUrl(value) ? url : null;
  } catch {
    return null;
  }
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function titleFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "Gallery URL";
  }
}

export function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

export function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function decodeJsString(value: string) {
  return value
    .replaceAll("\\/", "/")
    .replaceAll('\\"', '"')
    .replaceAll("\\'", "'");
}

export function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
