import { describe, expect, it } from "vitest";

import { redlibGalleryHtmlToMedia } from "./redlib-gallery";

describe("redlibGalleryHtmlToMedia", () => {
  it("extracts gallery images as original Reddit CDN URLs", () => {
    const media = redlibGalleryHtmlToMedia(`
      <div class="gallery">
        <figure>
          <a href="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one">
            <img loading="lazy" alt="Gallery image" src="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
          </a>
        </figure>
        <figure>
          <a href="/preview/pre/second.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=two">
            <img loading="lazy" alt="Gallery image" src="/preview/pre/second.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=two"/>
          </a>
        </figure>
      </div>
    `);

    expect(media).toEqual([
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
    ]);
  });
});
