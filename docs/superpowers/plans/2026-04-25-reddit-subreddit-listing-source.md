# Reddit Subreddit Listing Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime Reddit subreddit listing sources with a customizable usable media count.

**Architecture:** Extend the existing Reddit client to parse direct post URLs and subreddit listing URLs under one source input. Keep normalization runtime-only, store original user-provided URLs plus media count in workspace metadata, and update the Add source UI to send the selected count to the existing API route.

**Tech Stack:** Next.js App Router, React, TypeScript, zod, Vitest, Testing Library.

---

### Task 1: Reddit Client Parsing And Fetching

**Files:**

- Modify: `src/lib/reddit/client.ts`
- Modify: `src/lib/reddit/client.test.ts`

- [x] Write failing tests for parsing `top/?t=week` and `hot/` subreddit listing URLs.
- [x] Write failing tests proving listing fetches request a larger runtime limit and return only the selected number of usable media posts after skipped posts.
- [x] Implement source URL parsing, listing JSON URL construction, and per-source media limit capping.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/reddit/client.test.ts`.

### Task 2: API And Workspace Metadata

**Files:**

- Modify: `src/app/api/reddit/listing/route.ts`
- Modify: `src/lib/viewer/workspaces.ts`
- Modify: `src/lib/viewer/workspaces.test.ts`

- [x] Add `limit` to the API query schema and pass it into the Reddit client.
- [x] Add optional `limit` to Reddit source metadata while keeping original user-pasted URLs.
- [x] Update workspace serialization tests to prove listing URLs persist and runtime media does not.

### Task 3: Add Source UI

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Modify: `src/components/viewer/feed-workbench.test.tsx`

- [x] Add a Reddit media count input with default 20.
- [x] Send `limit` when opening live Reddit sources and when refetching saved Reddit sources.
- [x] Store listing URLs as source config URLs.
- [x] Update UI tests for listing URL input and limit query params.

### Task 4: Docs And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/media-persistence.md`

- [x] Update docs to mention user-provided Reddit listing URLs as allowed configuration metadata.
- [x] Run focused tests, typecheck, lint, format check, and build when feasible.
