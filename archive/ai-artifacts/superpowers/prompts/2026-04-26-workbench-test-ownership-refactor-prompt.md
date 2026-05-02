# Viewer Workbench Test Ownership Refactor With Continuous Verification

## Summary

- Start from clean `scrollable-mvp` after the workbench layer/selection/shell refactor is merged.
- Current line counts to verify before editing:
  - `src/components/viewer/feed-workbench.test.tsx` is about 3,919 lines.
  - `src/components/viewer/feed-workbench.tsx` is about 1,900 lines.
  - `src/components/viewer/feed-workbench-auth.test.tsx` is about 115 lines.
- Test-only, behavior-preserving refactor: no production code, UI, route, schema, storage, API, auth behavior, source behavior, media behavior, persistence shape, or user-facing behavior changes.
- Goal: split the oversized integrated workbench test file into focused workflow test files and shared test utilities so future agents stop adding all workbench tests to one file.
- Do not add new product assertions unless a moved test requires an equivalent helper assertion to preserve coverage.
- Do not change test intent, visible text expectations, aria queries, mocked payloads, fixture semantics, timing behavior, or persistence/privacy expectations.
- Preserve the current `feed-workbench-auth.test.tsx` file; this branch only splits the main workbench integration test.

## Current Test Problem

`feed-workbench.test.tsx` mixes many unrelated workflows:

- basic shell and layout chrome;
- URL source add/edit/runtime iframe behavior;
- Reddit source add/edit/hidden-item/runtime hydration behavior;
- workspace tabs, saved layouts, saved templates, and local/session storage behavior;
- local upload, folder upload, drag/drop, IndexedDB cache, and cache failure behavior;
- layer add/select/delete, inactive layer visibility, layer timers, and selected source behavior;
- fullscreen, keyboard, wheel, timer, focus layout, clear layout, and fixed-grid duplicate behavior;
- shared mocks, user actions, storage fixtures, runtime payload builders, and object URL/grid stubs.

Brooks-Lint risk: cognitive overload and change propagation in a single 3,900+ line test file. Split by user workflow and helper ownership, not by implementation details.

## Current Extracted Tests And Helpers

Existing focused tests already include:

- `src/components/viewer/feed-workbench-auth.test.tsx`
- `src/components/viewer/feed-view-pane.test.tsx`
- `src/components/viewer/media-renderer.test.tsx`
- `src/components/viewer/workbench/fill-visible-cells-state.test.ts`
- `src/components/viewer/workbench/free-drag-state.test.ts`
- `src/components/viewer/workbench/layer-actions.test.ts`
- `src/components/viewer/workbench/timer-actions.test.ts`
- `src/components/viewer/workbench/workspace-save-state.test.ts`

Do not move helper-level tests back into workbench integration tests.

## Setup

Start clean and create/claim one beads task before code:

```bash
git fetch origin
git checkout scrollable-mvp
git pull --ff-only origin scrollable-mvp
git status --short --branch

ISSUE_ID=$(bd create --title="Refactor workbench integration test ownership" --type=task --priority=2 --labels refactor,tests,workbench --acceptance "Behavior-preserving split of oversized workbench integration tests into focused workflow files plus shared test utilities; product code unchanged; coverage semantics unchanged; verification gates pass." --silent)
bd update "$ISSUE_ID" --claim

git switch -c refactor/workbench-test-ownership
```

Run baseline before edits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx
npm run e2e -- tests/e2e/home.spec.ts
```

## Key Changes

Split `src/components/viewer/feed-workbench.test.tsx` into focused files under `src/components/viewer/`.

### Slice 1: Shared Workbench Test Utilities

Create focused shared utilities:

- `src/components/viewer/feed-workbench-test-utils.tsx`
- `src/components/viewer/feed-workbench-test-fixtures.ts` only if the utility file would exceed 500 lines.

Move shared setup and fixtures out of `feed-workbench.test.tsx`:

- `vi.mock("@/lib/local-uploads/file-cache", ...)`;
- `WORKSPACE_STORAGE_KEY`, `WORKSPACE_TEMPLATE_STORAGE_KEY`, and `WORKSPACE_SESSION_STORAGE_KEY`;
- shared `beforeEach`/`afterEach` setup as an exported `installFeedWorkbenchTestHooks()` helper;
- `addDefaultSubredditSource`;
- `stubRuntimeFetch`, `stubUrlResolveFetch`, `deferredFetch`;
- `stubRandomUuids`, `stubObjectUrls`, `stubGridBounds`;
- `hashTestRedditItemId`;
- `openSavedLayouts`, `openSavedTemplates`, `selectSourceGrouping`;
- saved workspace/template fixture builders used by more than one split file.

Keep behavior unchanged:

- mocks must still be registered before `FeedWorkbench` is imported by test files;
- test cleanup must still clear timers, globals, mocks, `localStorage`, and `sessionStorage`;
- helper names should describe user actions or fixture purpose, not implementation internals;
- do not duplicate helpers across split files.

Commit:

```bash
git commit -m "refactor: extract workbench test utilities"
```

### Slice 2: Source Runtime Integration Tests

Create:

- `src/components/viewer/feed-workbench-sources.test.tsx`

Move source workflow tests from `feed-workbench.test.tsx`:

- unified URL, gallery URL, saved URL resolver hint, blocked iframe fallback, YouTube provider, and mobile iframe cap tests;
- Reddit post links, subreddit listing controls, multiple subreddits, separate Reddit sources, Reddit edit, hidden/unhidden items, gallery runtime items, saved Reddit hydration, and loading-state hydration tests;
- source dialog reset, source grouping control, add-source viewport anchor, add source while UI chrome hidden.

Keep in this file only source/runtime integration coverage. Helper-level URL, Reddit, and normalization tests must stay in their existing lower-level modules if present.

Commit:

```bash
git commit -m "refactor: split workbench source runtime tests"
```

### Slice 3: Workspace, Layout, And Template Tests

Create:

- `src/components/viewer/feed-workbench-workspaces.test.tsx`

Move workspace workflow tests:

- saved layout metadata and no-runtime-media persistence;
- fixed-layout template rejection and free-layout template save/open behavior;
- saved layout open/delete/list selection/reset behavior;
- saved local upload metadata visible in saved layouts;
- compact layer totals in saved layouts;
- seven-item scroll panels;
- template boxes, moving/resizing empty boxes, filling/restoring template boxes;
- workspace tab close/open/refresh/session-store behavior;
- multiple selected saved layouts/templates;
- auto-created blank layout naming;
- tab rename, name length limit, duplicate save-as layout names, saved snapshot rename behavior;
- global timer seconds per layout, legacy global timer derivation, and control update when opening saved layout.

Keep persistence/privacy assertions exactly equivalent. Do not add media previews or runtime media payloads to saved fixture expectations.

Commit:

```bash
git commit -m "refactor: split workbench workspace tests"
```

### Slice 4: Local Upload Tests

Create:

- `src/components/viewer/feed-workbench-local-uploads.test.tsx`

Move local upload workflow tests:

- reopen saved local uploads with in-session runtime media;
- saved local upload runtime media after layout tab close;
- reload saved local upload sources after page refresh;
- cached local upload restore, missing cache reupload prompt, cache metadata without blob URLs;
- large-video cache rejection fallback;
- separate local uploads and visible-slot limits;
- local source edit and cache remaining file;
- audio upload runtime media;
- blocking loading state while caching;
- folder upload attributes, dropped files on file/folder upload zones, selected folder as stacked source.

Keep local object URL and IndexedDB cache assertions intact. Do not persist absolute paths or object URLs.

Commit:

```bash
git commit -m "refactor: split workbench local upload tests"
```

### Slice 5: Layer And Interaction Tests

Create:

- `src/components/viewer/feed-workbench-layers.test.tsx`
- `src/components/viewer/feed-workbench-interactions.test.tsx`

Move layer tests to `feed-workbench-layers.test.tsx`:

- layer add/delete counts;
- middle layer renumbering;
- inactive layer grids mounted but hidden;
- no auto-select when switching layers;
- inactive layer timers continue advancing;
- fixed-grid assigned-cell stability after removal;
- hidden fixed-source count;
- duplicate selected source into visible empty cells;
- selected free-layout controls where currently covered by integration tests.

Move interaction tests to `feed-workbench-interactions.test.tsx`:

- focus layout and satellite mode;
- global/local timer controls;
- compact free-layout local timer inputs;
- content-only mode, show-UI auto-hide, Escape exit;
- keyboard and wheel feed movement;
- active stack item after switching layout modes;
- clear layout confirmation;
- core smoke/chrome tests that remain too broad for a narrower workflow file.

Keep `feed-workbench.test.tsx` as a small broad smoke file only, or delete it if every test has a clearer focused owner. If kept, it should remain under 500 lines.

Commit:

```bash
git commit -m "refactor: split workbench layer interaction tests"
```

## Interfaces And Constraints

- Production app code must not change in this branch.
- Public app/API/storage interfaces: no changes.
- No Supabase schema changes.
- No route changes.
- No auth behavior changes.
- No localStorage/sessionStorage key changes.
- No serialized workspace/session/template shape changes.
- No aria label, button text, visible UI text, input label, placeholder, title, or `data-testid` changes.
- No UI className, breakpoint, layout, mobile behavior, fullscreen behavior, or focus behavior changes.
- Do not make broad snapshot tests.
- Do not add duplicate setup helpers to split test files.
- If a split test file would exceed 800 lines, split it further before committing that slice.
- If `feed-workbench-test-utils.tsx` would exceed 500 lines, split fixtures/actions/stubs into separate focused utility files.
- If a moved test becomes flaky, stop and fix only the move/import/setup issue. Do not weaken assertions.
- Keep test names unchanged unless a name becomes misleading after moving.

## Brooks-Lint Guardrails

- Main Brooks-Lint risk: cognitive overload and change propagation in `feed-workbench.test.tsx`.
- Split by workflow ownership, not by production implementation file.
- Use the narrowest test owner that proves behavior.
- Before adding any new test during this branch, state why it belongs in a split integration file instead of a colocated helper test.
- Shared utilities should hide repetitive setup, not business behavior; keep assertions in test files.
- Do not create a single mega utility that becomes a second large-file problem.
- Before completion, report whether `feed-workbench.test.tsx` shrank, whether any new test/helper file is over 500 lines, and whether any test file remains above 800 lines.

## Privacy/Data Rules

Preserve all media persistence test coverage:

- saved layout/template tests must continue proving third-party runtime media is not persisted;
- saved Reddit hidden items must remain opaque `sha256:` hashes only;
- local upload byte-cache tests must continue proving saved layouts store metadata-only `cacheSetId` references;
- free-layout template tests must continue proving templates are source-empty;
- URL resolver hint tests may assert saved metadata hints, but not saved resolved media URLs, thumbnails, provider payloads, cookies, headers, or raw resolver output.

## Verification Loop

After each slice:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench*.test.tsx src/components/viewer/workbench/*.test.ts
npm run lint
npm run format:check
git diff --check
```

If `format:check` fails only due to moved test formatting:

```bash
npm run format
```

Then rerun the same full slice gate before committing.

If any check fails:

- Stop new refactor work.
- Fix only the latest owned move/import/setup change.
- Rerun the same gate.
- Continue only after green.

## Test Scenarios

All existing workbench integration scenarios must continue passing after being moved:

- source add/edit dialogs and runtime source behavior;
- URL resolver hint and iframe/provider display behavior;
- Reddit listing/post/galleries/hidden-item behavior;
- saved layout popup selection reset on each open;
- workspace tab rename/open/close/refresh behavior;
- saved layout/template metadata-only persistence;
- local upload cache, reupload, folder, drag/drop, and cache-rejection behavior;
- fixed-grid and free-layout rendering;
- layer add/select/delete behavior;
- inactive layer visibility and timers;
- audio/video layer-switch playback preservation;
- selected source controls in free layout;
- duplicate-fill timer synchronization;
- fixed-grid hidden source count;
- template boxes and free-layout drag behavior;
- global/local timer controls;
- keyboard, wheel, touch, and fullscreen behavior;
- mobile and desktop layout stability.

Do not add tests only to prove the split happened. The existing behavior tests are the coverage.

## Final Gate

After all slice commits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
git status --short --branch
```

## Completion

```bash
bd close "$ISSUE_ID" --reason "Implemented workbench test ownership refactor"
git status --short --branch
```

Before final response, report:

- before/after line counts for `feed-workbench.test.tsx` and every new split test/helper file;
- any test file still above 800 lines and why;
- whether any large test file grew;
- exact checks run and their results;
- any checks blocked and exact blocker.
