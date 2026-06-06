import { describe, expect, it } from "vitest";

import { oldRedditListingHtmlToItems } from "./oldreddit-listing";

describe("oldRedditListingHtmlToItems", () => {
  it("extracts direct images and gallery previews from old Reddit listing HTML", async () => {
    const items = await oldRedditListingHtmlToItems(
      `
        <div class=" thing id-t3_image123 odd link "
          data-fullname="t3_image123"
          data-author="poster"
          data-subreddit="pics"
          data-timestamp="1780006968000"
          data-url="https://i.redd.it/direct-image.jpg"
          data-permalink="/r/pics/comments/image123/direct_image/"
          data-nsfw="false">
          <p class="title">
            <a class="title may-blank outbound" href="https://i.redd.it/direct-image.jpg">Direct image</a>
          </p>
        </div>
        <div class=" thing id-t3_gallery123 even link "
          data-fullname="t3_gallery123"
          data-author="gallery-poster"
          data-subreddit="pics"
          data-timestamp="1780007000000"
          data-url="https://www.reddit.com/gallery/gallery123"
          data-permalink="/r/pics/comments/gallery123/gallery_title/"
          data-nsfw="true">
          <p class="title">
            <a class="title may-blank outbound" href="https://www.reddit.com/gallery/gallery123">Gallery title</a>
          </p>
          <div
            class="expando expando-uninitialized"
            data-cachedhtml="
              &lt;div class=&quot;media-preview&quot;&gt;
                &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;1&quot; href=&quot;https://preview.redd.it/first.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=one&quot;&gt;
                  &lt;img width=&quot;617&quot; height=&quot;768&quot;&gt;
                &lt;/a&gt;
                &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;2&quot; href=&quot;https://preview.redd.it/second.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=two&quot;&gt;
                  &lt;img width=&quot;745&quot; height=&quot;768&quot;&gt;
                &lt;/a&gt;
              &lt;/div&gt;
            "
          ></div>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/pics/top/?t=week",
      },
    );

    expect(items).toMatchObject([
      {
        id: "reddit:image123",
        title: "Direct image",
        permalink:
          "https://www.reddit.com/r/pics/comments/image123/direct_image/",
        author: "poster",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-05-28T22:22:48.000Z",
        media: [{ type: "image", url: "https://i.redd.it/direct-image.jpg" }],
      },
      {
        id: "reddit:gallery123",
        title: "Gallery title",
        author: "gallery-poster",
        subreddit: "pics",
        isNsfw: true,
        media: [
          {
            type: "image",
            url: "https://preview.redd.it/first.jpg?width=1080&format=pjpg&auto=webp&s=one",
            galleryIndex: 0,
          },
          {
            type: "image",
            url: "https://preview.redd.it/second.jpg?width=1080&format=pjpg&auto=webp&s=two",
            galleryIndex: 1,
          },
        ],
      },
    ]);
  });

  it("uses a runtime resolver for supported old Reddit listing links without persisted payloads", async () => {
    const items = await oldRedditListingHtmlToItems(
      `
        <div class=" thing id-t3_video123 odd link "
          data-fullname="t3_video123"
          data-author="poster"
          data-subreddit="videos"
          data-timestamp="1780006968000"
          data-url="https://v.redd.it/videoabc"
          data-permalink="/r/videos/comments/video123/video_title/"
          data-nsfw="false">
          <p class="title">
            <a class="title may-blank outbound" href="https://v.redd.it/videoabc">Video title</a>
          </p>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/videos/top/?t=week",
        resolveMedia: async ({ postId, url }) =>
          postId === "video123" && url === "https://v.redd.it/videoabc"
            ? [
                {
                  type: "video",
                  url: "https://v.redd.it/videoabc/HLSPlaylist.m3u8",
                  isHls: true,
                },
              ]
            : [],
      },
    );

    expect(items).toMatchObject([
      {
        id: "reddit:video123",
        title: "Video title",
        media: [
          {
            type: "video",
            url: "https://v.redd.it/videoabc/HLSPlaylist.m3u8",
            isHls: true,
          },
        ],
      },
    ]);
  });

  it("normalizes relative Reddit listing URLs before media resolution", async () => {
    const seenUrls: string[] = [];
    const items = await oldRedditListingHtmlToItems(
      `
        <div class=" thing id-t3_relative123 link "
          data-fullname="t3_relative123"
          data-author="poster"
          data-subreddit="kpop"
          data-url="/r/kpop/comments/relative123/title/"
          data-permalink="/r/kpop/comments/relative123/title/"
          data-nsfw="false">
          <p class="title">
            <a class="title may-blank outbound" href="/r/kpop/comments/relative123/title/">Relative Reddit link</a>
          </p>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
        resolveMedia: async ({ url }) => {
          seenUrls.push(url);
          return [];
        },
      },
    );

    expect(items).toEqual([]);
    expect(seenUrls).toEqual([
      "https://www.reddit.com/r/kpop/comments/relative123/title/",
    ]);
  });
});
