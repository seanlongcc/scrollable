# Viewer Workbench UI, Source Runtime, And Effect Orchestration Refactor With Continuous Verification

## Summary

- Start from clean `scrollable-mvp`.
- Previous workbench save/timer/drag orchestration refactor is already merged into `scrollable-mvp`.
- Current line counts to verify before editing:
  - `src/components/viewer/feed-workbench.tsx` is about 2,232 lines.
  - `src/components/viewer/workbench/views.tsx` is about 925 lines.
  - `src/components/viewer/workbench/source-dialogs.tsx` is about 879 lines.
- Behavior-preserving refactor only: no UI, route, schema, storage, API, auth behavior, or persistence-shape changes.
- Goal: split the two over-800-line workbench UI modules and extract remaining source add/edit runtime, hydration, and account/effect orchestration helpers while keeping React state ownership in `FeedWorkbench`.
- This prompt intentionally groups the next refactor candidates so they can be handled in one branch, but each slice must stay independently verifiable.
- Do not introduce reducer/hook rewrites in this branch.
- Do not refactor workspace tabs/open/delete flows, layer CRUD, save/timer/fill/drag helpers, source normalization internals, or media rendering internals unless required to preserve behavior.

## Current Extracted Modules

Existing workbench modules already include:

- `src/components/viewer/workbench/types.ts`
- `src/components/viewer/workbench/helpers.ts`
- `src/components/viewer/workbench/dialogs.tsx`
- `src/components/viewer/workbench/source-dialogs.tsx`
- `src/components/viewer/workbench/fields.tsx`
- `src/components/viewer/workbench/views.tsx`
- `src/components/viewer/workbench/local-sources.ts`
- `src/components/viewer/workbench/runtime-sources.ts`
- `src/components/viewer/workbench/runtime-hydration-state.ts`
- `src/components/viewer/workbench/source-edit-state.ts`
- `src/components/viewer/workbench/source-add-state.ts`
- `src/components/viewer/workbench/workspace-state.ts`
- `src/components/viewer/workbench/workspace-actions.ts`
- `src/components/viewer/workbench/workspace-save-state.ts`
- `src/components/viewer/workbench/session-placement.ts`
- `src/components/viewer/workbench/free-layout-state.ts`
- `src/components/viewer/workbench/free-drag-state.ts`
- `src/components/viewer/workbench/fill-visible-cells-state.ts`
- `src/components/viewer/workbench/timer-actions.ts`
- `src/components/viewer/workbench/layer-state.ts`

## Setup

Start clean and create/claim one beads task before code:

```bash
git fetch origin
git checkout scrollable-mvp
git pull --ff-only origin scrollable-mvp
git status --short --branch

ISSUE_ID=$(bd create --title="Refactor workbench UI source runtime orchestration" --type=task --priority=2 --labels refactor,workbench --acceptance "Behavior-preserving split of workbench source dialogs/views plus source add/edit runtime, hydration, and account/effect orchestration; public app/API/storage/auth interfaces unchanged; verification gates pass." --silent)
bd update "$ISSUE_ID" --claim

git switch -c refactor/workbench-ui-source-runtime-orchestration
```

Run baseline before edits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx
npm run e2e -- tests/e2e/home.spec.ts
```

## Key Changes

Extract internal workbench UI and orchestration under `src/components/viewer/workbench/`.

### Slice 1: Split Source Dialogs

Split `src/components/viewer/workbench/source-dialogs.tsx` into focused files while preserving the current `source-dialogs.tsx` import surface.

Create:

- `src/components/viewer/workbench/source-add-dialog.tsx`
- `src/components/viewer/workbench/source-edit-dialog.tsx`
- `src/components/viewer/workbench/source-dialog-fields.tsx`

Move:

- `SourceDialog` and its add-source form sections into `source-add-dialog.tsx`;
- `EditSourceDialog` and its edit-source form sections into `source-edit-dialog.tsx`;
- shared source-dialog-only controls such as `LabeledSelect` into `source-dialog-fields.tsx`;
- keep `source-dialogs.tsx` as a small barrel that exports `SourceDialog` and `EditSourceDialog` so `FeedWorkbench` import paths do not need to change.

Keep behavior unchanged:

- all visible text, aria labels, input labels, button names, dialog titles, and `data-testid` values;
- local file input attributes, folder upload attributes, accepted MIME types, and disabled/loading states;
- Reddit hidden-item matching behavior and saved hidden-hash display behavior;
- source grouping control behavior;
- source edit save validation and callback order.

Commit:

```bash
git commit -m "refactor: split workbench source dialogs"
```

### Slice 2: Split Workbench Views

Split `src/components/viewer/workbench/views.tsx` into focused view files while preserving the current `views.tsx` import surface.

Create:

- `src/components/viewer/workbench/fixed-grid-view.tsx`
- `src/components/viewer/workbench/free-grid-view.tsx`
- `src/components/viewer/workbench/session-pane.tsx`
- `src/components/viewer/workbench/url-source-pane.tsx`
- `src/components/viewer/workbench/focus-layout.tsx`

Move:

- `FixedGridView` into `fixed-grid-view.tsx`;
- `FreeGridView` into `free-grid-view.tsx`;
- `SessionPane` into `session-pane.tsx`;
- `UrlSourcePane` into `url-source-pane.tsx`;
- `FocusLayout` into `focus-layout.tsx`;
- keep `views.tsx` as a small barrel that exports the same named components.

Keep behavior unchanged:

- fixed-grid and free-grid placement, layer visibility, playback-active gating, empty cell controls, template-slot controls, drag handles, fullscreen behavior, local file edit controls, source info display, and timer controls;
- all class names, visible text, aria labels, `data-testid` values, and keyboard/touch behavior.

Commit:

```bash
git commit -m "refactor: split workbench views"
```

### Slice 3: Source Add Runtime Actions

Create `src/components/viewer/workbench/source-add-actions.ts`.

Move source-add orchestration out of `FeedWorkbench` for:

- resolving Reddit add form inputs through existing `resolveRedditAddInput`;
- checking separate-source slot capacity through existing `separateSourceSlotError`;
- calling `createRedditSessionSources`;
- building URL source config and calling `createUrlSessionSource`;
- preparing local add files through existing `prepareLocalAddFiles`;
- calling `createLocalSessionSources` with a caller-provided `cacheLocalFiles` function.

Keep these in `FeedWorkbench`:

- `setIsLoading`;
- `toast.error` and `toast.warning`;
- `addSessions` / `addSession`;
- closing `SourceDialog`;
- file input reset callbacks;
- local object URL registry ownership;
- `cacheLocalFiles` implementation and browser support state.

Return discriminated results from the new helpers instead of calling toast. Preserve existing error message text and timing.

Do not change:

- Reddit URL parsing or limit normalization behavior;
- URL resolver behavior;
- source grouping behavior;
- local cache behavior;
- source placement behavior;
- media persistence semantics.

Commit:

```bash
git commit -m "refactor: extract workbench source add actions"
```

### Slice 4: Source Edit Runtime Actions

Create `src/components/viewer/workbench/source-edit-actions.ts`.

Move source-edit runtime orchestration out of `FeedWorkbench` for:

- Reddit edit validation that requires at least one source URL;
- Reddit limit normalization;
- calling `fetchEditedRedditSource`;
- calling `fetchEditedUrlSource`;
- local edit validation that requires at least one uploadable file;
- creating local runtime items and requesting local file cache through caller-provided callbacks;
- returning edited source results ready for existing `applyEditedRedditSourceToSession`, `applyEditedUrlSourceToSession`, or `applyLocalRuntimeItemsToSession`.

Keep these in `FeedWorkbench`:

- `setEditingSourceId`;
- `setSessions` / `updateSession`;
- `withSessionRuntimeLoading`;
- toast side effects;
- `createLocalRuntimeItems`;
- `cacheLocalFiles`;
- local object URL registry ownership.

Do not change:

- source edit dialog behavior;
- loading state timing;
- error message text;
- Reddit hidden/unhidden hash behavior;
- local cache metadata behavior;
- runtime-only media handling.

Commit:

```bash
git commit -m "refactor: extract workbench source edit actions"
```

### Slice 5: Hydration, Account, And Effect Orchestration

Create or extend focused helpers:

- `src/components/viewer/workbench/runtime-hydration-actions.ts`
- `src/components/viewer/workbench/account-actions.ts`
- `src/components/viewer/workbench/workbench-effect-state.ts`

Move pure or callback-driven orchestration for:

- selecting visible runtime hydration candidates and calling `hydrateRuntimeSources`;
- building hydration error messages without calling toast;
- applying hydrated runtime sessions through existing `applyHydratedRuntimeSessions`;
- deriving initial account state from Supabase user;
- wrapping sign-out result handling without directly mutating React state;
- advancing all session timers for the interval tick;
- moving the active keyboard session timer index for arrow-key navigation;
- deriving hidden-UI reveal timeout state if it can stay pure and small.

Keep these in `FeedWorkbench`:

- `useEffect` registration and cleanup;
- `window` event listener registration;
- Supabase client creation and auth subscription lifecycle;
- React setters;
- toast side effects;
- `createLocalRuntimeItems`;
- `activeKeyboardSessionId` derivation;
- visibility and UI gating in JSX.

Do not change:

- auth subscription timing or signed-in/signed-out UI state;
- sign-out toast message text;
- runtime hydration visibility rules;
- URL hydration warning behavior;
- timer tick interval;
- keyboard navigation behavior;
- fullscreen reveal/hide timing.

Commit:

```bash
git commit -m "refactor: extract workbench effect orchestration"
```

## Interfaces And Constraints

- Public app/API/storage interfaces: no changes.
- No Supabase schema changes.
- No route changes.
- No auth behavior changes.
- No localStorage/sessionStorage key changes.
- No serialized workspace/session/template shape changes.
- No aria label, button text, visible UI text, input label, placeholder, or `data-testid` changes.
- No layout, className, breakpoint, mobile behavior, or fullscreen behavior changes unless required to preserve existing behavior after file splits.
- Keep `FeedWorkbench` as owner of React state, effects, side effects, toasts, refs, and UI composition.
- Internal exports only: helper functions/types needed by `FeedWorkbench` or split workbench components.
- If a slice would push one new file over 800 lines or add more than 50 lines to a file already over 500 lines, split that file further in the same subsystem before continuing.
- If any slice becomes broader than the listed files and behaviors, stop and write a follow-up prompt instead of expanding scope.

## Privacy/Data Rules

Preserve all media persistence rules:

- Do not persist third-party runtime media.
- Do not persist media URLs, thumbnails, provider payloads, Reddit JSON, raw Reddit IDs, extracted gallery URLs, `yt-dlp` output, cookies, headers, or local object URLs.
- Reddit hidden items may remain only opaque `sha256:` hashes.
- Local uploaded file bytes may remain only in IndexedDB through existing cache behavior, with metadata-only `cacheSetId` in saved layouts.
- Free-layout templates must remain source-empty.
- URL resolver hints may remain saved as metadata, but resolved runtime media and provider payloads must remain runtime-only.
- Source add/edit/action helpers must not introduce storage of runtime `items`, `allItems`, `urlResolution`, `localFiles`, media URLs, thumbnails, or provider payloads outside existing runtime-only state.

## Verification Loop

After each extraction:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx
npm run lint
npm run format:check
git diff --check
```

If `format:check` fails only due to moved code formatting:

```bash
npm run format
```

Then rerun the same full slice gate before committing.

If any check fails:

- Stop new refactor work.
- Fix only the latest owned change.
- Rerun the same gate.
- Continue only after green.

## Test Scenarios

Existing workbench tests must continue covering:

- source add dialog Reddit, URL, local upload, folder upload, loading, grouping, and slot-capacity behavior;
- source edit dialog Reddit hidden/unhidden behavior, URL edit behavior, and local file replacement behavior;
- local cache success/rejection paths;
- runtime hydration and URL source warning behavior;
- account signed-in/signed-out/sign-out behavior;
- fixed-grid and free-layout rendering;
- template boxes and free-layout drag behavior;
- global/local timer controls;
- keyboard and fullscreen behavior;
- mobile and desktop layout stability.

No new tests by default for pure component file splits.
Add focused helper tests when exported helpers encode validation, result unions, source add/edit runtime orchestration, hydration result mapping, account result mapping, or timer/keyboard state transitions not already covered by existing workbench tests.

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
bd close "$ISSUE_ID" --reason "Implemented workbench UI source runtime orchestration refactor"
git status --short --branch
```

Before final response, report:

- before/after line counts for `feed-workbench.tsx`, `source-dialogs.tsx`, and `views.tsx`;
- any file still above 800 lines and why;
- whether any large file grew;
- exact checks run and their results;
- any checks blocked and exact blocker.
