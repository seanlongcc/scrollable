# Unified URL Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic URL source with resolver hints, Reddit-as-provider behavior, metadata/iframe fallback rendering, and metadata-only persistence.

**Architecture:** Introduce small URL-source library modules for validation, resolver orchestration, provider adapters, and persistence-safe types. Keep UI integration in `FeedWorkbench`, using existing feed panes for direct media/provider media and a focused static pane for metadata/iframe/blocked states.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Vitest, Testing Library, existing shadcn/Radix UI components.

---

### Task 1: URL Source Types And Validation

**Files:**

- Create: `src/lib/url-source/types.ts`
- Create: `src/lib/url-source/validation.ts`
- Create: `src/lib/url-source/validation.test.ts`
- Modify: `src/lib/feed/types.ts`
- Modify: `src/lib/viewer/workspaces.ts`
- Modify: `src/lib/viewer/workspaces.test.ts`
- Modify: `src/lib/config/feed-config.ts`
- Modify: `src/lib/config/feed-config.test.ts`

- [ ] Write failing validation tests for accepting `http:`/`https:` and rejecting `file:`, `data:`, `javascript:`, and malformed URLs.
- [ ] Run `nvm use 24 && npm test -- src/lib/url-source/validation.test.ts`.
- [ ] Add `UrlResolverHint`, `UrlSourceConfig`, and `UrlRuntimeResolution` types.
- [ ] Add `normalizeUrlSourceUrl()` and `parseUrlSourceConfig()` with Zod-backed validation.
- [ ] Add `"url"` to feed/workspace source unions while preserving legacy `kind: "reddit"` configs.
- [ ] Update workspace serialization tests to assert URL + hint persists and runtime URL resolution/media payloads do not.
- [ ] Run targeted tests for validation, feed config, and workspaces.

### Task 2: Resolver Chain And API Route

**Files:**

- Create: `src/lib/url-source/resolver.ts`
- Create: `src/lib/url-source/resolver.test.ts`
- Create: `src/app/api/url/resolve/route.ts`
- Create: `src/app/api/url/resolve/route.test.ts`
- Modify: `src/lib/reddit/client.ts`

- [ ] Write failing resolver tests for direct media before provider, provider before metadata, metadata before iframe, hinted resolver first, failed hint fallback, and hint update only after success.
- [ ] Run `nvm use 24 && npm test -- src/lib/url-source/resolver.test.ts`.
- [ ] Implement direct-media detection from URL extension and response content type.
- [ ] Implement `provider:reddit` adapter by calling existing Reddit runtime fetch with one URL and returning flattened runtime items.
- [ ] Implement generic metadata fetch that returns runtime-only title/description/site name/optional preview image without persistence.
- [ ] Implement iframe fallback and unsupported error states.
- [ ] Add `/api/url/resolve` route that validates URL/hint, runs the resolver, and returns `Cache-Control: no-store`.
- [ ] Run resolver and route tests.

### Task 3: Workbench URL Source UI And Runtime

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Modify: `src/components/viewer/feed-workbench.test.tsx`
- Modify: `src/components/viewer/feed-view-pane.tsx` if timer chrome needs URL-source exclusions.

- [ ] Write failing UI tests for adding a URL source, saved layout reopen with hint-first resolution, blocked/capped iframe fallback, and multiple URL sources under a mobile-like viewport.
- [ ] Run targeted failing UI tests.
- [ ] Replace new Reddit-link creation with URL source creation while keeping subreddit helper controls as URL builders.
- [ ] Resolve URL sources lazily only when their layer/slot is visible; set `isRuntimeLoading` during resolution.
- [ ] Update successful URL resolutions to store only `resolverHint` on `sourceConfig`.
- [ ] Render direct-media/provider URL results through the existing feed pane.
- [ ] Render metadata, iframe, blocked, and unsupported URL results through a static URL pane with external-open action and no timer/carousel controls.
- [ ] Keep legacy Reddit sessions hydrating/editing through existing code path for backwards compatibility.
- [ ] Run targeted UI tests.

### Task 4: Verification

**Files:**

- Modify: docs only if behavior notes need adjustment.

- [ ] Run `nvm use 24 && npm run typecheck`.
- [ ] Run `nvm use 24 && npm run lint`.
- [ ] Run `nvm use 24 && npm run format:check`; run `nvm use 24 && npm run format` if needed.
- [ ] Run `nvm use 24 && npm test`.
- [ ] Run `nvm use 24 && npm run build`.
- [ ] For UI changes, start `nvm use 24 && npm run dev` and verify desktop and mobile URL-source flows in browser if browser dependencies are available.
- [ ] Run `git status --short --branch` and summarize changed files.
