import { z } from "zod";

import type { UrlResolverHint, UrlSourceConfig } from "./types";

export const urlResolverHintSchema = z
  .string()
  .refine((value): value is UrlResolverHint => isUrlResolverHint(value), {
    message: "Use a supported URL resolver hint",
  });

export const urlSourceConfigSchema = z
  .object({
    kind: z.literal("url"),
    url: z
      .string()
      .trim()
      .min(1)
      .transform((value) => normalizeUrlSourceUrl(value)),
    title: z.string().trim().min(1).max(120).optional(),
    resolverHint: urlResolverHintSchema.optional(),
  })
  .strip();

export function parseUrlSourceConfig(input: unknown): UrlSourceConfig {
  return urlSourceConfigSchema.parse(input);
}

export function normalizeUrlSourceUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("invalid_url_source_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("url_source_requires_http");
  }

  return url.toString();
}

export function isUrlResolverHint(value: string): value is UrlResolverHint {
  return (
    value === "direct-media" ||
    value === "metadata" ||
    value === "iframe" ||
    /^provider:[a-z0-9-]+$/i.test(value)
  );
}
