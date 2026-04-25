# Gallery URL Source Design

Scrollable will add a runtime-only gallery URL provider for user-pasted direct gallery/read URLs from a small set of public image gallery sites. The first pass focuses on direct gallery or reader URLs whose image lists can be derived without login, cookies, DRM bypass, or search crawling.

## Scope

The first implementation supports direct gallery/read URLs for these connector families where HaruNeko already documents stable extraction shapes:

- Akuma.moe
- Hitomi
- IMHentai
- nHentai
- HentaiNexus
- HentaiFox
- HentaiRead
- E-Hentai, best-effort public gallery pages only

The following names stay out of the first pass until their public URL formats and extraction behavior are confirmed: HDoujin, Panda Backup, Schale Network, Yabai, EAHentai, HenTalk, and Wholesome Hentai God List. Wholesome Hentai God List appears to be an index of links, so it should be treated later as a source-of-sources design rather than a direct image gallery adapter.

Search result pages are also out of scope. Users paste a specific gallery/read URL into the existing URL source input.

## Provider Model

The URL resolver gains a `provider:gallery` branch after specialized Reddit/YouTube handling and before generic `yt-dlp`, metadata, and iframe fallback. The branch recognizes known gallery hosts, fetches only the user-pasted page and any required same-gallery reader/page HTML, and converts discovered image URLs into runtime `RuntimeFeedItem` objects.

Each page image becomes one runtime item with one `image` media entry so the existing vertical feed can scroll through the gallery. Item IDs use opaque hashes of the source URL plus page index. The visible title comes from the gallery page title when available, falling back to the URL host.

## Persistence

Saved URL source configs continue storing only the user-entered URL, optional user-entered title, and the successful resolver hint. The app must not persist third-party image URLs, image lists, gallery HTML, provider JSON, cookies, raw gallery IDs, thumbnails, or normalized runtime items.

`provider:gallery` is a resolver hint only. Reopening a saved layout refetches images at runtime from the saved pasted URL. Hitomi uses `provider:hitomi` with the pasted page as an iframe rather than saved or proxied image URLs.

## Runtime Fetching

The gallery provider uses server-side fetch with `cache: "no-store"` and conservative headers. It may send a normal `Referer` while fetching metadata. It must not proxy or rehost image bytes, and browsers cannot spoof a third-party `Referer` while rendering direct images.

The provider has a hard page cap to avoid accidental bulk scraping. A reasonable first-pass cap is 100 images per URL. When a gallery exposes more pages, Scrollable returns the first capped set and leaves deeper crawling to a future explicit design.

The provider should fail closed:

- Unknown gallery host: return `null` so later resolvers can try.
- Unsupported URL path on a known host: return `null` so metadata/iframe fallback can still show something.
- Known host but no image URLs found: return `null`.
- Fetch or parsing failure: return `null`.

## Adapter Strategy

Adapters are small data-driven functions under `src/lib/url-source/gallery.ts` rather than copied HaruNeko code. Use the referenced projects for extraction ideas only, and keep implementation idiomatic to this repo.

Adapter patterns:

- nHentai: prefer `/api/v2/galleries/:id?include=pages` when available, sending `Authorization: Key <NHENTAI_API_KEY>` server-side when configured, then build page image URLs from `media_id` plus each `pages[].path` extension using the `i1.nhentai.net/galleries` image host. If v2 fails, try the legacy gallery JSON API, then read thumbnails and convert thumbnail image paths to page image paths. If the site returns an anti-bot challenge, do not bypass it and do not fall back to an embedded full webpage.
- IMHentai and HentaiFox: parse page globals and hidden inputs from gallery HTML to build image URLs.
- HentaiNexus: parse `pageData` image entries from reader HTML.
- HentaiRead: decode the embedded base64 chapter JSON where available.
- Hitomi: direct CDN images require a `hitomi.la` browser referrer, which Scrollable cannot add without a media proxy. Because media proxying is forbidden, resolve Hitomi gallery pages as `provider:hitomi` iframes instead of direct gallery items.
- Akuma: use the public same-page POST JSON only when the page exposes the required CSRF token and cover image base.
- E-Hentai: best-effort public HTML pagination and image-page parsing without authenticated-only behavior.

## Safety And Compliance

The provider must not bypass login walls, paid access, DRM, captchas, Cloudflare challenges, or site-specific access controls. If a site requires authentication or blocks automated fetches, Scrollable falls back to metadata or iframe.

The UI does not add adult-site-specific search affordances in this pass. The existing URL field remains generic.

## Testing

Use TDD. Tests cover:

- URL resolver chooses `provider:gallery` before `yt-dlp` and metadata.
- Saved `provider:gallery` hints run through the provider path first.
- Unknown gallery hosts and failed gallery extraction fall through.
- Gallery result serialization returns runtime image items but saved workspace metadata contains only URL/title/hint.
- Each supported adapter maps representative HTML or script fixtures to image runtime items without storing fetched payloads.
