# Gallery URL Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime-only direct gallery URL support for a narrow set of public image gallery sites through the existing URL source resolver.

**Architecture:** Add a focused `src/lib/url-source/gallery.ts` provider that recognizes known gallery hosts, fetches public HTML with `cache: "no-store"`, extracts image URLs into runtime feed items, and never persists fetched image lists or payloads. Wire it into `resolveUrlSource()` after Reddit/YouTube and before `yt-dlp`, metadata, and iframe fallback.

**Follow-up adjustment:** nHentai gallery API requests use the `doujinshi-dl-nhentai` v2 shape: `/api/v2/galleries/:id?include=pages` with `Authorization: Key <NHENTAI_API_KEY>`, then `media_id` plus `pages[].path` extensions to build `i1.nhentai.net/galleries/<media_id>/<page>.<ext>` URLs. Hitomi direct image URLs are not browser-embeddable from Scrollable because the CDN requires a `hitomi.la` referrer, so Hitomi now resolves as a `provider:hitomi` iframe instead of `provider:gallery` image items unless the project data rules are changed to allow a live media proxy.

**Tech Stack:** Next.js App Router route handler, TypeScript, Vitest, existing `RuntimeFeedItem` and URL source resolver types.

---

### Task 1: Gallery Extraction Unit Tests

**Files:**

- Create: `src/lib/url-source/gallery.test.ts`
- Create: `src/lib/url-source/gallery.ts`

- [x] Write failing tests for representative adapters:
  - `extractGalleryRuntimeItems("https://nhentai.net/g/123456/")` maps thumbnail URLs to page image URLs.
  - `extractGalleryRuntimeItems("https://imhentai.xxx/gallery/123456/example/")` maps `g_th`, `load_server`, `load_dir`, and `load_id` into image URLs.
  - `extractGalleryRuntimeItems("https://hentaifox.com/gallery/123456/")` maps `g_th`, `load_dir`, and `load_id` into image URLs.
  - `extractGalleryRuntimeItems("https://hentainexus.com/read/123456")` maps `pageData` image entries into image URLs.
  - `extractGalleryRuntimeItems("https://hentairead.com/hentai/example/chapter-1/")` decodes embedded chapter JSON into image URLs.
  - Unknown hosts return an empty list.

- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/gallery.test.ts`.

Expected: tests fail because `src/lib/url-source/gallery.ts` has no implementation yet.

- [x] Implement minimal gallery provider helpers:
  - `extractGalleryRuntimeItems(url, options)` exported for resolver use.
  - `GalleryFetchLike` typed fetch dependency for tests.
  - Host dispatch by normalized hostname.
  - Runtime item construction using hashed source URL plus page index.
  - HTML parsing helpers based on bounded regex extraction for scripts, hidden inputs, and image attributes.

- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/gallery.test.ts`.

Expected: tests pass.

### Task 2: Resolver Integration Tests

**Files:**

- Modify: `src/lib/url-source/resolver.test.ts`
- Modify: `src/lib/url-source/resolver.ts`

- [x] Write failing resolver tests:
  - Known gallery URL resolves as `mode: "provider"`, `hint: "provider:gallery"`, `provider: "gallery"` before `ytDlpResolver`.
  - Saved `resolverHint: "provider:gallery"` tries the gallery provider first.
  - Empty gallery extraction falls back to metadata.

- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/resolver.test.ts`.

Expected: tests fail because resolver does not call the gallery provider.

- [x] Add optional `galleryResolver?: (url: string) => Promise<RuntimeFeedItem[]>` to resolver options for tests.

- [x] Add `resolveGalleryProvider()` in `resolver.ts` and call it after Reddit and before `resolveYtDlpProvider()`.

- [x] Return:

```ts
{
  status: "resolved",
  mode: "provider",
  hint: "provider:gallery",
  provider: "gallery",
  title: source.title ?? items[0]?.title ?? "Gallery URL",
  externalUrl: source.url,
  items,
}
```

- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/resolver.test.ts`.

Expected: tests pass.

### Task 3: Persistence Safety Tests

**Files:**

- Modify: `src/lib/viewer/workspaces.test.ts`
- Modify: `src/components/viewer/feed-workbench.test.tsx`

- [x] Add or extend a workspace serialization test proving a URL source with `resolverHint: "provider:gallery"` persists only `kind`, `url`, optional `title`, and `resolverHint`.

- [x] Add or extend a workbench URL-source test proving a successful gallery result updates the saved hint to `provider:gallery` but does not write image URLs into localStorage layout metadata.

- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/workspaces.test.ts src/components/viewer/feed-workbench.test.tsx`.

Expected: tests pass if existing metadata-only paths already cover the new hint; fix only if a regression appears.

### Task 4: Docs And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/media-persistence.md`
- Modify: `AGENTS.md` only if workflow, commands, storage rules, or architecture rules changed.

- [x] Update docs to mention runtime-only gallery URL extraction and `provider:gallery` hints.

- [x] Run targeted tests:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/url-source/gallery.test.ts src/lib/url-source/resolver.test.ts src/lib/viewer/workspaces.test.ts src/components/viewer/feed-workbench.test.tsx
```

- [x] Run full checks:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && npm run typecheck
source ~/.nvm/nvm.sh && nvm use 24 && npm run lint
source ~/.nvm/nvm.sh && nvm use 24 && npm run format:check
source ~/.nvm/nvm.sh && nvm use 24 && npm test
source ~/.nvm/nvm.sh && nvm use 24 && npm run build
```

- [x] Run `git status --short --branch` and summarize changed files.
