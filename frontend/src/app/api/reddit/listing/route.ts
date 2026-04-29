import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchRedditRuntimePostLinks } from "@/lib/reddit/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  urls: z.array(z.string()).or(z.string()),
  allowNsfw: z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const urlParams = url.searchParams.getAll("urls");
  const parsed = querySchema.safeParse({
    urls: urlParams.length > 1 ? urlParams : url.searchParams.get("urls"),
    allowNsfw: url.searchParams.get("allowNsfw") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_reddit_post_links_request" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchRedditRuntimePostLinks(parsed.data);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reddit_error";
    const status =
      message === "invalid_reddit_post_url" ||
      message === "invalid_reddit_listing_url"
        ? 400
        : message === "reddit_post_not_found"
          ? 404
          : message === "reddit_post_has_no_supported_media" ||
              message === "reddit_source_has_no_supported_media"
            ? 422
            : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
