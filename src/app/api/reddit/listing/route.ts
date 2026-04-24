import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchRedditRuntimeListing } from "@/lib/reddit/client";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  subreddit: z.string(),
  sort: z.enum(["top", "hot", "new"]).optional(),
  timeRange: z
    .enum(["hour", "day", "week", "month", "year", "all"])
    .optional(),
  limit: z.string().optional(),
  skip: z.string().optional(),
  allowNsfw: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_reddit_listing_request" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchRedditRuntimeListing(parsed.data);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reddit_error";
    const status = message === "subreddit_not_found" ? 404 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
