# Reddit Post Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Reddit OAuth subreddit listing with user-pasted Reddit post links that refetch runtime media without storing third-party media payloads.

**Architecture:** Add a Reddit post-link parser/fetcher in `src/lib/reddit/client.ts`, keep media extraction in `normalization.ts`, and replace the Add source Reddit controls with a textarea-driven post links flow. Saved workspace source config stores user-provided permalinks only.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Zod, Vitest, Testing Library, Playwright.

---

### Task 1: Reddit Post-Link Fetching

**Files:**

- Modify: `src/lib/reddit/client.ts`
- Modify: `src/lib/reddit/client.test.ts`
- Modify: `src/app/api/reddit/listing/route.ts`

- [ ] Write failing tests for parsing one or more Reddit post URLs, rejecting listing URLs, and fetching without Reddit OAuth environment variables.
- [ ] Implement `parseRedditPostLinksInput`, `fetchRedditRuntimePostLinks`, and a helper that turns supported Reddit permalinks into `.json?raw_json=1` URLs.
- [ ] Update the API route to accept `urls` and `allowNsfw`, return normalized items, and map validation/fetch errors to JSON errors.
- [ ] Run `nvm use 24 && npm test src/lib/reddit/client.test.ts`.

### Task 2: Workspace Source Config

**Files:**

- Modify: `src/lib/viewer/workspaces.ts`
- Modify: `src/lib/viewer/workspaces.test.ts`

- [ ] Change `RedditSourceConfig` from subreddit listing fields to `{ kind: "reddit"; urls: string[]; allowNsfw: boolean }`.
- [ ] Verify serialization stores Reddit post URLs and excludes runtime item IDs/media URLs.
- [ ] Run `nvm use 24 && npm test src/lib/viewer/workspaces.test.ts`.

### Task 3: Add Source UI

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Modify: `src/components/viewer/feed-workbench.test.tsx`
- Modify: `tests/e2e/home.spec.ts`

- [ ] Replace subreddit/sort/range/limit/skip state with a `redditUrls` textarea state seeded with an empty string.
- [ ] Replace Reddit source UI labels with “Reddit post links”, “Post URLs”, “Show NSFW Reddit posts”, and “Open Reddit links”.
- [ ] Send pasted URLs to `/api/reddit/listing?urls=...&allowNsfw=...`; saved Reddit sessions refetch from stored URLs.
- [ ] Update UI and e2e tests to route the new query shape and interact with the textarea.
- [ ] Run `nvm use 24 && npm test src/components/viewer/feed-workbench.test.tsx` and `nvm use 24 && npm run e2e`.

### Task 4: Docs And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/media-persistence.md`
- Modify: `AGENTS.md`

- [ ] Update project docs to say Reddit is a direct post-link runtime source and user-pasted permalinks are allowed config data.
- [ ] Run `nvm use 24 && npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, and `npm run build`.
- [ ] Check `git status --short --branch`.
