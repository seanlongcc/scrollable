import { describe, expect, it, vi } from "vitest";

import {
  fetchRedditRuntimePostLinks,
  parseRedditPostLinksInput,
} from "./client";

describe("parseRedditPostLinksInput", () => {
  it("parses pasted Reddit post URLs and allowNsfw=false query strings", () => {
    expect(
      parseRedditPostLinksInput({
        urls: [
          "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
          "https://old.reddit.com/r/pics/comments/abc123/title",
        ].join("\n"),
        allowNsfw: "false",
      }),
    ).toMatchObject({
      urls: [
        "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
        "https://www.reddit.com/r/pics/comments/abc123/title/",
      ],
      allowNsfw: false,
    });
  });

  it("rejects Reddit listing URLs because only direct posts are supported", () => {
    expect(() =>
      parseRedditPostLinksInput({ urls: "https://www.reddit.com/r/pics/" }),
    ).toThrow();
  });
});

describe("fetchRedditRuntimePostLinks", () => {
  it("fetches public post JSON without Reddit OAuth credentials", async () => {
    const originalClientId = process.env.REDDIT_CLIENT_ID;
    const originalClientSecret = process.env.REDDIT_CLIENT_SECRET;
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "1sui8xh",
                  title: "Concept photo",
                  subreddit: "kpop",
                  post_hint: "image",
                  url_overridden_by_dest: "https://i.redd.it/photo.jpg",
                },
              },
            ],
          },
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/.json?raw_json=1",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "reddit:1sui8xh",
      title: "Concept photo",
      subreddit: "kpop",
    });

    if (originalClientId) process.env.REDDIT_CLIENT_ID = originalClientId;
    if (originalClientSecret) {
      process.env.REDDIT_CLIENT_SECRET = originalClientSecret;
    }
  });
});
