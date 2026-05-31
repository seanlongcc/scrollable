import { describe, expect, it } from "vitest";

import type { RuntimeMedia } from "@/lib/feed/types";
import { normalizeRedditAtomFeed } from "./rss";

describe("normalizeRedditAtomFeed", () => {
  it("resolves RSS entry media in parallel while preserving feed order", async () => {
    const pending: Array<{
      postId: string | null;
      resolve: (media: RuntimeMedia[]) => void;
    }> = [];
    const request = normalizeRedditAtomFeed(
      `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          ${rssEntry("first")}
          ${rssEntry("second")}
          ${rssEntry("third")}
        </feed>
      `,
      {
        subreddit: "videos",
        limit: 3,
        resolveMedia: ({ postId }) =>
          new Promise((resolve) => pending.push({ postId, resolve })),
      },
    );

    expect(pending.map(({ postId }) => postId)).toEqual([
      "first",
      "second",
      "third",
    ]);

    pending[2]?.resolve([video("third")]);
    pending[0]?.resolve([video("first")]);
    pending[1]?.resolve([video("second")]);

    const result = await request;
    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:first",
      "reddit:second",
      "reddit:third",
    ]);
  });
});

function rssEntry(id: string) {
  return `
    <entry>
      <content type="html">
        &lt;a href=&quot;https://www.redgifs.com/watch/${id}&quot;&gt;[link]&lt;/a&gt;
      </content>
      <id>t3_${id}</id>
      <link href="https://www.reddit.com/r/videos/comments/${id}/title/"/>
      <updated>2026-05-30T17:41:27+00:00</updated>
      <title>${id}</title>
    </entry>
  `;
}

function video(id: string): RuntimeMedia {
  return {
    type: "video",
    url: `https://media.redgifs.com/${id}.mp4`,
  };
}
