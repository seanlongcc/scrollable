# Source Editing And Subreddit Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add split Reddit input controls and source-content editing for Reddit and local sources.

**Architecture:** Keep behavior inside the existing workbench boundary because source creation, runtime items, and layout metadata already live there. Add small helper functions for canonical subreddit URLs and local runtime item metadata so tests can drive behavior without a broader refactor.

**Tech Stack:** Next.js App Router, React 19, TypeScript, shadcn/Radix UI, Vitest, Testing Library.

---

### Task 1: Split Reddit Add Source Input

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [ ] Write failing tests for `Subreddit` and `Links` modes.
- [ ] Run `nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx -t "accepts a bare subreddit name"`.
- [ ] Implement Reddit input mode state, sort/time selects, and canonical URL construction.
- [ ] Run the targeted tests and verify they pass.

### Task 2: Edit Reddit Source Contents

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Modify: `src/components/viewer/feed-view-pane.tsx`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [ ] Write a failing test that opens `Edit r/pics`, removes one Reddit URL, saves, and verifies one refetch with the remaining URL.
- [ ] Run the targeted failing test.
- [ ] Add an edit button prop to `FeedViewPane`, pass it from source panes, and add a source edit dialog.
- [ ] Implement Reddit save by refetching with remaining URLs, updating title, source config, items, loading state, and timer item count.
- [ ] Run the targeted test and verify it passes.

### Task 3: Edit Local Source Contents

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [ ] Write a failing test that uploads two local files, opens edit source, removes one file, saves, and verifies only the remaining file is shown and cached.
- [ ] Run the targeted failing test.
- [ ] Keep original local `File` references on runtime items only and omit them from serialized workspaces.
- [ ] Implement local edit save by rebuilding runtime items from remaining files and caching the reduced file list when possible.
- [ ] Run the targeted test and verify it passes.

### Task 4: Verification

**Files:**

- Modify: no new files expected.

- [ ] Run `nvm use 24 && npm run typecheck`.
- [ ] Run `nvm use 24 && npm run lint`.
- [ ] Run `nvm use 24 && npm run format:check`.
- [ ] Run `nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx`.
- [ ] Run build if time permits: `nvm use 24 && npm run build`.
