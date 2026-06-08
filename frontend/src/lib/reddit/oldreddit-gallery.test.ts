import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchOldRedditGalleryPost,
  oldRedditGalleryHtmlToMedia,
} from "./oldreddit-gallery";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("oldRedditGalleryHtmlToMedia", () => {
  it("extracts gallery images from collapsed old Reddit cached HTML", () => {
    const media = oldRedditGalleryHtmlToMedia(`
      <div
        class="expando expando-uninitialized"
        data-cachedhtml="
          &lt;div class=&quot;media-preview&quot; data-media-ids=&quot;first,second&quot;&gt;
            &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-first&quot;&gt;
              &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;1&quot; href=&quot;https://preview.redd.it/first.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=one&quot; target=&quot;_blank&quot;&gt;
                &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/first.jpg?width=320&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-one&quot; width=&quot;617&quot; height=&quot;768&quot;&gt;
              &lt;/a&gt;
            &lt;/div&gt;
            &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-second&quot;&gt;
              &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;2&quot; href=&quot;https://preview.redd.it/second.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=two&quot; target=&quot;_blank&quot;&gt;
                &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/second.jpg?width=640&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-two&quot; width=&quot;745&quot; height=&quot;768&quot;&gt;
              &lt;/a&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        "
      ></div>
    `);

    expect(media).toEqual([
      {
        type: "image",
        url: "https://preview.redd.it/first.jpg?width=1080&format=pjpg&auto=webp&s=one",
        width: 617,
        height: 768,
        galleryIndex: 0,
      },
      {
        type: "image",
        url: "https://preview.redd.it/second.jpg?width=1080&format=pjpg&auto=webp&s=two",
        width: 745,
        height: 768,
        galleryIndex: 1,
      },
    ]);
  });

  it("fetches compact old Reddit post pages for gallery fallback", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async (): Promise<string> => "<html></html>",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchOldRedditGalleryPost({
      allowNsfw: true,
      permalink:
        "https://www.reddit.com/r/kpop/comments/1txlgk7/way2_x_profile_photos/",
      postId: "1txlgk7",
      userAgent: "test-agent",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://old.reddit.com/r/kpop/comments/1txlgk7/way2_x_profile_photos/.compact",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "over18=1",
          "User-Agent": "test-agent",
        }),
      }),
    );
  });
});
