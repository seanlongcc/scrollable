# Scrollable

Mobile-first reels-style runtime feed viewer for user-provided URLs and local uploads. URL sources accept `http`/`https` links and resolve at runtime as direct media, known provider media/embeds such as Reddit, YouTube, and direct gallery URLs, optional `yt-dlp` extraction, generic metadata, or iframe fallback.

## Commands

```bash
nvm use 24
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Optional arbitrary-site video extraction uses a local `yt-dlp` executable at runtime. Install it on the server or development machine and keep it on `PATH`, or set `YTDLP_PATH` to the executable path.

Optional nHentai gallery API access uses `NHENTAI_API_KEY` server-side at runtime. Keep it in `.env.local` or deployment secrets only; do not expose it as a `NEXT_PUBLIC_` variable.

Supabase local verification needs Docker Desktop WSL integration:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
```

## Data Rule

Do not persist, rehost, proxy-cache, or store third-party media, provider payloads, thumbnails, extracted media URLs, gallery image URLs, screenshots, cookies, HTML, API keys, runtime request headers, or fetched Reddit JSON responses. User-pasted URL sources, including Reddit post permalinks, subreddit listing URLs, and direct gallery URLs, are allowed as saved configuration because the user intentionally provides them. Saved URL sources may store only the user-entered URL/title/settings and the last successful resolver hint. Saved Reddit item exclusions may store only opaque `sha256:` hashes of runtime Reddit item IDs, never raw item/post IDs or media payloads.

Viewer layouts save tab, grid, layer, timer, and source configuration metadata only. Layouts support up to three sequential stacked source layers (`Layer 1`, `Layer 2`, `Layer 3`), with active-layer editing and per-layer source/file counts. Local layouts open from the viewer's layouts overlay without login; signed-in users can also sync layout metadata to account data.

Local image, video, and audio media renders through session-only object URLs. Browsers do not expose reusable absolute file paths, so Scrollable copies user-selected local file bytes into browser IndexedDB when available, stores only a `cacheSetId` in saved layout metadata, and rebuilds fresh object URLs from that browser cache after refresh.
