import { describe, expect, it } from "vitest";

import { oldRedditGalleryHtmlToMedia } from "./oldreddit-gallery";

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
});
