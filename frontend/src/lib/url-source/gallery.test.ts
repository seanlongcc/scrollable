import { describe, expect, it, vi } from "vitest";

import { extractGalleryRuntimeItems, type GalleryFetchLike } from "./gallery";

describe("extractGalleryRuntimeItems", () => {
  const now = () => "2026-04-25T00:00:00.000Z";

  it("maps nHentai thumbnails to page image URLs", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <html>
          <head><title>nHentai Sample</title></head>
          <body>
            <div id="info"><h1 class="title">nHentai Sample</h1></div>
            <div class="thumbs">
              <img class="lazyload" data-src="https://t.nhentai.net/galleries/98765/1t.jpg">
              <img class="lazyload" data-src="//t.nhentai.net/galleries/98765/2t.png">
            </div>
          </body>
        </html>
      `),
    );

    const items = await extractGalleryRuntimeItems(
      "https://nhentai.net/g/123456/",
      { fetch: fetchMock, now },
    );

    expect(items).toMatchObject([
      {
        source: "url",
        title: "nHentai Sample",
        isNsfw: true,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "image",
            url: "https://i.nhentai.net/galleries/98765/1.jpg",
          },
        ],
      },
      {
        media: [
          {
            type: "image",
            url: "https://i.nhentai.net/galleries/98765/2.png",
          },
        ],
      },
    ]);
    expect(items[0]?.id).toMatch(/^url:gallery:/);
  });

  it("maps nHentai v2 API gallery metadata to page image URLs", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v2/galleries/123456") {
        return jsonResponse({
          id: 123456,
          media_id: "98765",
          title: { english: "nHentai v2 API Sample" },
          num_pages: 4,
          pages: [
            { path: "/galleries/98765/1.jpg" },
            { path: "/galleries/98765/2.png" },
            { path: "/galleries/98765/3.gif" },
            { path: "/galleries/98765/4.webp" },
          ],
        });
      }

      return htmlResponse("<title>Should not be needed</title>");
    });

    const items = await extractGalleryRuntimeItems(
      "https://nhentai.net/g/123456/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://i1.nhentai.net/galleries/98765/1.jpg",
      "https://i1.nhentai.net/galleries/98765/2.png",
      "https://i1.nhentai.net/galleries/98765/3.gif",
      "https://i1.nhentai.net/galleries/98765/4.webp",
    ]);
    expect(items[0]?.title).toBe("nHentai v2 API Sample");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://nhentai.net/api/v2/galleries/123456?include=pages"),
      expect.anything(),
    );
  });

  it("falls back to legacy nHentai API gallery metadata", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/gallery/123456") {
        return jsonResponse({
          media_id: "98765",
          title: { pretty: "nHentai API Sample" },
          images: {
            pages: [{ t: "j" }, { t: "p" }, { t: "g" }, { t: "w" }],
          },
        });
      }

      return htmlResponse("<title>Should not be needed</title>");
    });

    const items = await extractGalleryRuntimeItems(
      "https://nhentai.net/g/123456/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://i.nhentai.net/galleries/98765/1.jpg",
      "https://i.nhentai.net/galleries/98765/2.png",
      "https://i.nhentai.net/galleries/98765/3.gif",
      "https://i.nhentai.net/galleries/98765/4.webp",
    ]);
    expect(items[0]?.title).toBe("nHentai API Sample");
  });

  it("sends the nHentai API key to gallery API requests", async () => {
    const fetchMock = vi.fn<GalleryFetchLike>(async () =>
      jsonResponse({
        media_id: "98765",
        title: { pretty: "nHentai API Sample" },
        images: {
          pages: [{ t: "j" }],
        },
      }),
    );

    await extractGalleryRuntimeItems("https://nhentai.net/g/123456/", {
      fetch: fetchMock,
      now,
      nhentaiApiKey: "test-api-key",
    });

    const apiCall = fetchMock.mock.calls.find(
      ([input]) => new URL(String(input)).pathname === "/api/gallery/123456",
    );
    const headers = new Headers(apiCall?.[1]?.headers);

    expect(headers.get("authorization")).toBe("Key test-api-key");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("maps IMHentai globals and hidden inputs to image URLs", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <h1>IMHentai Sample</h1>
        <input id="load_server" value="7">
        <input id="load_dir" value="/files/gallery">
        <input id="load_id" value="abc123">
        <script>
          var g_th = {
            "0": ["j"],
            "1": ["p"],
            "2": ["g"],
            "3": ["w"]
          };
        </script>
      `),
    );

    const items = await extractGalleryRuntimeItems(
      "https://imhentai.xxx/gallery/123456/sample/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://m7.imhentai.xxx/files/gallery/abc123/1.jpg",
      "https://m7.imhentai.xxx/files/gallery/abc123/2.png",
      "https://m7.imhentai.xxx/files/gallery/abc123/3.gif",
      "https://m7.imhentai.xxx/files/gallery/abc123/4.webp",
    ]);
  });

  it("maps HentaiFox globals and hidden inputs to image URLs", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <h1>HentaiFox Sample</h1>
        <input id="load_dir" value="/images/gallery">
        <input id="load_id" value="fox-id">
        <script>
          window.g_th = {"0":["j"],"1":["p"],"2":["b"],"3":["w"]};
        </script>
      `),
    );

    const items = await extractGalleryRuntimeItems(
      "https://hentaifox.com/gallery/140237/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://i3.hentaifox.com/images/gallery/fox-id/1.jpg",
      "https://i3.hentaifox.com/images/gallery/fox-id/2.png",
      "https://i3.hentaifox.com/images/gallery/fox-id/3.bmp",
      "https://i3.hentaifox.com/images/gallery/fox-id/4.webp",
    ]);
  });

  it("maps HentaiNexus pageData image entries to image URLs", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <h1 class="title">HentaiNexus Sample</h1>
        <script>
          const pageData = [
            { image: "https://static.hentainexus.test/1.jpg" },
            { image: "https://static.hentainexus.test/2.webp" }
          ];
        </script>
      `),
    );

    const items = await extractGalleryRuntimeItems(
      "https://hentainexus.com/read/123456",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://static.hentainexus.test/1.jpg",
      "https://static.hentainexus.test/2.webp",
    ]);
  });

  it("decodes HentaiRead chapter JSON into image URLs", async () => {
    const payload = Buffer.from(
      JSON.stringify({
        data: {
          chapter: {
            images: [{ src: "001.jpg" }, { src: "folder/002.png" }],
          },
        },
      }),
    ).toString("base64");
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <h1>HentaiRead Sample</h1>
        <script>
          const chapterExtraData = { baseUrl: "https://img.hentairead.test/base" };
          window.__chapterData = "${payload}";
        </script>
      `),
    );

    const items = await extractGalleryRuntimeItems(
      "https://hentairead.com/hentai/sample/chapter-1/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://img.hentairead.test/base/001.jpg",
      "https://img.hentairead.test/base/folder/002.png",
    ]);
  });

  it("maps Akuma same-page JSON to image URLs", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return jsonResponse(["001.jpg", "002.png"]);
        }

        return htmlResponse(`
        <meta name="csrf-token" content="csrf-value">
        <h1>Akuma Sample</h1>
        <img class="img-thumbnail" src="https://cdn.akuma.test/galleries/sample/cover.jpg">
      `);
      },
    );

    const items = await extractGalleryRuntimeItems(
      "https://akuma.moe/g/sample",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://cdn.akuma.test/galleries/sample/001.jpg",
      "https://cdn.akuma.test/galleries/sample/002.png",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps Hitomi gallery scripts and routing metadata to webp image URLs", async () => {
    const firstHash =
      "0000000000000000000000000000000000000000000000000000000000000001";
    const secondHash =
      "0000000000000000000000000000000000000000000000000000000000000011";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/galleries/2995838.js") {
        return javascriptResponse(
          `var galleryinfo = ${JSON.stringify({
            files: [
              { hash: firstHash, name: "001.png" },
              { hash: secondHash, name: "002.png" },
            ],
          })}`,
        );
      }
      if (url.pathname === "/gg.js") {
        return javascriptResponse(`
          'use strict';
          gg = { m: function(g) { var o = 0; switch (g) { case 256: o = 1; break; } return o; }, s: function(h) { var m = /(..)(.)$/.exec(h); return parseInt(m[2]+m[1], 16).toString(10); }, b: 'route-prefix/' };
        `);
      }

      return htmlResponse(`
        <h1 id="gallery-brand"><a>Hitomi Sample</a></h1>
        <script>
          var galleryid = "2995838";
          document.write('<script src="//ltn.gold-usergeneratedcontent.net/galleries/2995838.js"><\\/script>');
        </script>
      `);
    });

    const items = await extractGalleryRuntimeItems(
      "https://hitomi.la/manga/misshitsu-swimsuit-2995838.html",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      `https://w2.gold-usergeneratedcontent.net/route-prefix/256/${firstHash}.webp`,
      `https://w1.gold-usergeneratedcontent.net/route-prefix/257/${secondHash}.webp`,
    ]);
  });

  it("maps public E-Hentai image pages to image URLs", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/s/")) {
        return htmlResponse(`
          <html>
            <body><img id="img" src="https://ehgt.test/full/001.jpg"></body>
          </html>
        `);
      }

      return htmlResponse(`
        <h1 id="gn">E-Hentai Sample</h1>
        <div id="gdt">
          <a href="https://e-hentai.org/s/token/123456-1">1</a>
        </div>
      `);
    });

    const items = await extractGalleryRuntimeItems(
      "https://e-hentai.org/g/123456/token/",
      { fetch: fetchMock, now },
    );

    expect(items.map((item) => item.media[0]?.url)).toEqual([
      "https://ehgt.test/full/001.jpg",
    ]);
  });

  it("returns no items for unknown gallery hosts", async () => {
    const fetchMock = vi.fn(async () => htmlResponse("<title>Unknown</title>"));

    await expect(
      extractGalleryRuntimeItems("https://example.com/gallery/1", {
        fetch: fetchMock,
        now,
      }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function htmlResponse(html: string) {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
}

function javascriptResponse(value: string) {
  return new Response(value, {
    headers: { "content-type": "application/javascript" },
  });
}
