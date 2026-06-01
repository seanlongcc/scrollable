import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks fallback scheduling", () => {
  it("does not wait for slow reddit.com JSON before trying api.reddit.com JSON", async () => {
    const slowJson = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(slowJson.promise)
      .mockResolvedValueOnce(
        jsonResponse({
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "apiimage",
                  post_hint: "image",
                  subreddit: "pics",
                  title: "API image",
                  url: "https://i.redd.it/api-image.jpg",
                },
              },
            ],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      limit: 10,
    });
    await nextTick();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(request).resolves.toMatchObject({
      items: [
        {
          id: "reddit:apiimage",
          media: [{ url: "https://i.redd.it/api-image.jpg" }],
        },
      ],
    });
  });

  it("does not wait for slow reddit.com RSS before trying old.reddit.com RSS", async () => {
    const slowRss = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(403))
      .mockResolvedValueOnce(errorResponse(403))
      .mockReturnValueOnce(slowRss.promise)
      .mockResolvedValueOnce(
        textResponse(`
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;span&gt;&lt;a href=&quot;https://i.redd.it/old-rss-image.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
              </content>
              <id>t3_oldrss</id>
              <link href="https://www.reddit.com/r/pics/comments/oldrss/old_rss_image/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>Old RSS image</title>
            </entry>
          </feed>
        `),
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      limit: 10,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await nextTick();
    }

    expect(fetchMock).toHaveBeenCalledTimes(4);
    await expect(request).resolves.toMatchObject({
      items: [
        {
          id: "reddit:oldrss",
          media: [{ url: "https://i.redd.it/old-rss-image.jpg" }],
        },
      ],
    });
  });
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

function textResponse(body: string) {
  return {
    ok: true,
    text: async () => body,
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => "",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
