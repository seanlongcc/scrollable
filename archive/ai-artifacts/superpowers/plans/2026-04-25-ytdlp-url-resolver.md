# yt-dlp URL Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runtime-only `yt-dlp` URL resolver so supported arbitrary video/audio pages can open in the existing Scrollable feed without custom embeds.

**Architecture:** Keep URL extraction inside the existing server-side URL resolver chain. Add a focused `yt-dlp` helper that shells out to a local `yt-dlp` command or Python module, converts only browser-playable formats into runtime feed items, and never persists extracted media URLs or raw extractor JSON.

**Tech Stack:** Next.js App Router route handler, TypeScript, Vitest, `child_process`, existing `hls.js` playback path.

---

### Task 1: Resolver Tests

**Files:**

- Modify: `src/lib/url-source/resolver.test.ts`

- [x] Add a failing test proving a non-specialized URL resolves through `yt-dlp` before metadata.
- [x] Add a failing test proving `provider:yt-dlp` hints run the provider path first.
- [x] Add a failing test proving empty `yt-dlp` results fall back to metadata/iframe instead of becoming unsupported too early.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/resolver.test.ts` and verify the new tests fail because the resolver does not accept a `ytDlpResolver` option yet.

### Task 2: yt-dlp Helper

**Files:**

- Create: `src/lib/url-source/ytdlp.ts`
- Modify: `src/lib/url-source/resolver.ts`

- [x] Add typed `yt-dlp` JSON mapping for title, timestamp, age limit, top-level URL, and formats.
- [x] Prefer HLS manifests and browser-playable combined video/audio formats.
- [x] Carry `yt-dlp` HLS segment query parameters at runtime so signed `.ts` segments can load without persisting those parameters.
- [x] Return no runtime items when no playable media exists, when `yt-dlp` is unavailable, or when extraction fails.
- [x] Keep the raw extractor payload scoped to the server process and return only runtime media items.

### Task 3: Route And Runtime Integration

**Files:**

- Modify: `src/lib/url-source/resolver.ts`
- Existing: `src/app/api/url/resolve/route.ts`
- Existing: `src/components/viewer/media-renderer.tsx`

- [x] Insert `yt-dlp` into the existing provider resolver after specialized YouTube/Reddit providers and before metadata/iframe fallback.
- [x] Return `hint: "provider:yt-dlp"` on success so saved URL source configs can retry extraction first without storing runtime media URLs.
- [x] Reuse existing HLS rendering path for `.m3u8` streams.

### Task 4: Verification

**Files:**

- Verify changed source, tests, and docs.

- [x] Run targeted unit tests: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/resolver.test.ts src/lib/url-source/validation.test.ts src/lib/viewer/video.test.ts`
- [x] Run full unit tests: `source ~/.nvm/nvm.sh && nvm use 24 && npm test`.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run typecheck`.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run lint`.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run format:check`.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run build`.
- [x] Try a live resolver call for `https://weverse.io/stayc/live/3-226763714` with `yt-dlp` available in the environment.
