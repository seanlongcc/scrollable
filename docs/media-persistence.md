# Media Persistence Rule

Scrollable stores user-authored configuration metadata only.

Forbidden:

- Reddit or third-party media files
- Reddit post or listing payloads
- Extracted media URLs and thumbnails
- Cached provider/listing responses
- Fetched HTML, provider JSON, cookies, screenshots, and normalized runtime items
- Proxy-cached third-party media

Allowed:

- Supabase Auth user identity
- User profile/preferences
- User-pasted `http`/`https` URL source links in feed configuration settings, including Reddit post permalinks and subreddit listing URLs
- URL source resolver hints such as `direct-media`, `provider:reddit`, `provider:youtube`, `provider:yt-dlp`, `metadata`, and `iframe`
- Collections, tags, NSFW flags, share settings, ownership, timestamps
- Runtime logs/rate-limit records that do not contain third-party media payloads
- User-selected local file byte copies in browser IndexedDB for saved local layouts
- Layout layer metadata, including layer IDs, names, active layer, and source membership
- Opaque SHA-256 hashes of Reddit runtime item IDs that the user explicitly hides from a saved source

Runtime URL feeds resolve source metadata on demand from user-provided links. Resolution may use the pasted URL directly as media, a known provider adapter/embed such as Reddit or YouTube, runtime-only `yt-dlp` extraction, runtime-only page metadata, or a static iframe fallback. `yt-dlp` HLS segment query parameters are runtime-only and must not be saved. Local image, video, and audio uploads use browser object URLs for the current session only and are revoked on cleanup.

Do not store local upload object URLs or absolute filesystem paths. Browser file paths are not reusable access grants. Saved local layouts may store copied user-selected file bytes as Blob data in browser IndexedDB, plus a metadata-only `cacheSetId` in saved layouts. On refresh, the app rebuilds fresh object URLs from that browser cache. If cached bytes are missing, ask the user to re-upload.

Saved Reddit item exclusions may store only `sha256:` item ID hashes scoped to the source configuration. This allows a user to hide a specific gallery image/video item while still avoiding raw Reddit item/post IDs. Do not store raw Reddit item IDs, raw post IDs, titles, authors, permalinks, media URLs, thumbnails, cached JSON, or normalized runtime items for hidden Reddit content.
