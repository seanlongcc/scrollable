# Incremental Viewer Workbench Save, Timer, And Drag Orchestration Refactor With Continuous Verification

## Summary

- Start from clean `scrollable-mvp`.
- Previous workbench source add orchestration refactor is already merged into `scrollable-mvp`.
- Current `src/components/viewer/feed-workbench.tsx` is about 2,363 lines. Verify current line count before editing.
- Behavior-preserving refactor only: no UI, route, schema, storage, API, auth behavior, or persistence-shape changes.
- Goal: extract saved layout/template save orchestration, timer/fill-visible-cells orchestration, and free-layout drag state helpers while keeping React state ownership in `FeedWorkbench`.
- This prompt intentionally groups the next three small refactors because each single refactor is too slow as a standalone branch.
- Do not introduce reducer/hook rewrites in this branch.
- Do not refactor source add/edit flows, runtime hydration, workspace tabs/open/delete flows, layer CRUD, source dialogs, or view rendering in this branch unless required to preserve behavior.

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
- `src/components/viewer/workbench/session-placement.ts`
- `src/components/viewer/workbench/free-layout-state.ts`
- `src/components/viewer/workbench/layer-state.ts`

## Setup

Start clean and create/claim one beads task before code:

```bash
git fetch origin
git checkout scrollable-mvp
git pull --ff-only origin scrollable-mvp
git status --short --branch

ISSUE_ID=$(bd create --title="Refactor workbench save timer drag orchestration" --type=task --priority=2 --labels refactor,workbench --acceptance "Behavior-preserving FeedWorkbench save/account sync, timer/fill, and free-drag orchestration split; public app/API/storage/auth interfaces unchanged; verification gates pass." --silent)
bd update "$ISSUE_ID" --claim

git switch -c refactor/workbench-save-timer-drag-orchestration
```

Run baseline before edits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx
npm run e2e -- tests/e2e/home.spec.ts
```

## Key Changes

Extract internal workbench orchestration under `src/components/viewer/workbench/`.

### Slice 1: Save Validation And Account Sync State

Create `src/components/viewer/workbench/workspace-save-state.ts`.

Move pure helpers for:

- opening save dialog state defaults from the current workspace name;
- validating layout save names, including empty names, max length, and duplicate layout names;
- validating template save names, including free-layout-only, empty names, max length, and duplicate template names;
- preparing the renamed active workspace tab list for layout saves;
- building `viewer_sessions` upsert rows from serialized workspaces and a user ID;
- building `viewer_templates` upsert rows from serialized templates and a user ID;
- returning existing save error message text without calling toast.

Keep these in `FeedWorkbench`:

- individual React setters;
- calls to `persistCurrentWorkspace` and `persistCurrentTemplate`;
- Supabase client creation and `auth.getUser`;
- actual `.from("viewer_sessions").upsert(...)` and `.from("viewer_templates").upsert(...)` calls;
- `setSaveError`, `setIsSaveOpen`, and toast side effects.

Do not change:

- account sync timing;
- local save timing;
- toast success/error message text;
- `viewer_sessions` or `viewer_templates` row shape;
- metadata-only saved workspace/template semantics.

Commit:

```bash
git commit -m "refactor: extract workbench save orchestration"
```

### Slice 2: Timer And Fill Visible Cells State

Create `src/components/viewer/workbench/timer-actions.ts` and `src/components/viewer/workbench/fill-visible-cells-state.ts`.

Move pure timer helpers for:

- applying a new global timer duration to sessions;
- applying one view's local timer duration;
- switching one view between local and global timer mode while preserving current global-sync behavior;
- applying global next/pause/restart actions to session timers.

Move pure fill-visible-cells helpers for:

- selecting the source session by ID;
- finding empty visible fixed slots for the source layer;
- finding matching free-layout rectangles for cloned sources;
- building cloned sessions with new IDs, copied source/runtime fields, cleared `templateSlotId`, and offset active indexes;
- sorting resulting sessions by fixed slot.

Keep these in `FeedWorkbench`:

- `setGlobalSeconds`;
- `setSessions`;
- `selected` and `visibleEmptySlots` UI gating;
- `createId` callback ownership;
- button handlers and visible UI.

Do not change:

- timer min/max clamping;
- global timer sync behavior;
- local timer pause/elapsed behavior;
- clone active-index offset behavior;
- fixed/free placement behavior for duplicates.

Commit:

```bash
git commit -m "refactor: extract workbench timer and fill state"
```

### Slice 3: Free Drag State

Update `src/components/viewer/workbench/free-layout-state.ts` or create `src/components/viewer/workbench/free-drag-state.ts` if that keeps responsibilities clearer.

Move pure helpers for:

- calculating drag delta columns/rows from pointer coordinates and cell size;
- calculating next move rect with `FREE_LAYOUT_SIZE` clamping;
- calculating next resize rect with `FREE_LAYOUT_SIZE` clamping;
- updating the active `FreeDragState.currentRect` only when the pointer event belongs to the active drag ID;
- resolving the drag commit target as session vs template slot.

Keep these in `FeedWorkbench`:

- pointer event listener registration and cleanup;
- `setFreeDrag`;
- calls to `updateFreeRect` and `updateTemplateSlotRect`;
- source/template selection side effects in `beginFreeDrag`;
- eslint dependency comment unless the helper extraction makes it unnecessary.

Do not change:

- drag grid snapping;
- move/resize clamp boundaries;
- pointerup commit behavior;
- template slot vs session drag behavior;
- selected-source behavior on drag start.

Commit:

```bash
git commit -m "refactor: extract workbench free drag state"
```

## Interfaces And Constraints

- Public app/API/storage interfaces: no changes.
- No Supabase schema changes.
- No route changes.
- No auth behavior changes.
- No localStorage/sessionStorage key changes.
- No serialized workspace/session/template shape changes.
- No aria label, button text, visible UI text, or `data-testid` changes.
- No source dialog or view layout changes.
- Preserve exact saved payload semantics for:
  - `viewer_sessions`
  - `viewer_templates`
  - `scrollable.workspaces.v1`
  - `scrollable.workspace-session.v1`
  - `scrollable.workspace-templates.v1`
- Internal exports only: helper functions/types needed by `FeedWorkbench`.

## Privacy/Data Rules

Preserve all media persistence rules:

- Do not persist third-party runtime media.
- Do not persist media URLs, thumbnails, provider payloads, Reddit JSON, raw Reddit IDs, extracted gallery URLs, `yt-dlp` output, cookies, headers, or local object URLs.
- Reddit hidden items may remain only opaque `sha256:` hashes.
- Local uploaded file bytes may remain only in IndexedDB through existing cache behavior, with metadata-only `cacheSetId` in saved layouts.
- Free-layout templates must remain source-empty.
- URL resolver hints may remain saved as metadata, but resolved runtime media and provider payloads must remain runtime-only.
- Save/account sync helpers must not add runtime `items`, `allItems`, `urlResolution`, `localFiles`, media URLs, thumbnails, or provider payloads to saved Supabase rows.

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

- layout save validation and duplicate-name handling;
- template save validation and free-layout-only behavior;
- local layout/template persistence without runtime media payloads;
- account sync success/failure paths where covered by existing auth tests;
- `viewer_sessions` and `viewer_templates` metadata-only payload behavior;
- global timer duration changes;
- local timer mode/duration controls;
- global next/pause/restart controls;
- fill-visible-cells duplication and active-index offset behavior;
- fixed/free placement for duplicated sources;
- free-layout move and resize behavior;
- template-box drag behavior;
- mobile and desktop layout stability;
- fullscreen UI.

No new tests by default because this is behavior-preserving refactor.
Add focused helper tests only if exported helpers encode validation, payload-building, timer, fill, or drag behavior not already covered by existing workbench tests.

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
