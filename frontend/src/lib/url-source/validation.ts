import { z } from "zod";

import type { UrlResolverHint, UrlSourceConfig } from "./types";
import { normalizeVideoTimeRange } from "@/lib/viewer/video-time-range";

export const urlResolverHintSchema = z
  .string()
  .refine((value): value is UrlResolverHint => isUrlResolverHint(value), {
    message: "Use a supported URL resolver hint",
  });

const urlSourceUrlSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => normalizeUrlSourceUrl(value));

const videoTimeRangeSchema = z
  .object({
    startSeconds: z.number().int().min(0).optional(),
    endSeconds: z.number().int().min(0).optional(),
  })
  .strip()
  .superRefine((range, context) => {
    const result = normalizeVideoTimeRange(range);
    if (!result.ok) {
      context.addIssue({
        code: "custom",
        message: result.error,
      });
    }
  })
  .transform((range) => {
    const result = normalizeVideoTimeRange(range);
    return result.ok ? result.range : range;
  });

const urlSourceRowSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    url: urlSourceUrlSchema,
    videoTimeRange: videoTimeRangeSchema.optional(),
  })
  .strip()
  .transform(({ videoTimeRange, ...row }) => ({
    ...row,
    ...(videoTimeRange ? { videoTimeRange } : {}),
  }));

export const urlSourceConfigSchema = z
  .object({
    kind: z.literal("url"),
    url: urlSourceUrlSchema,
    urls: z.array(urlSourceUrlSchema).min(1).optional(),
    urlRows: z.array(urlSourceRowSchema).min(1).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    resolverHint: urlResolverHintSchema.optional(),
  })
  .strip()
  .transform(({ urls, urlRows, ...source }) => {
    const rowUrls = urlRows?.map((row) => row.url);

    return {
      ...source,
      url: rowUrls?.[0] ?? source.url,
      ...(urlRows?.length ? { urlRows } : {}),
      ...(rowUrls && rowUrls.length > 1
        ? { urls: rowUrls }
        : urls && urls.length > 1
          ? { urls }
          : {}),
    };
  });

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
