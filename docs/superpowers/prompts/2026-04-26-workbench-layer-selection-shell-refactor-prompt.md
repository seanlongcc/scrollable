# Viewer Workbench Layer, Selection, And Shell UI Refactor With Continuous Verification

## Summary

- Start from clean `scrollable-mvp`.
- Previous workbench UI/source/runtime orchestration refactor is already merged into `scrollable-mvp`.
- Current line counts to verify before editing:
  - `src/components/viewer/feed-workbench.tsx` is about 2,212 lines.
  - `src/components/viewer/feed-workbench.test.tsx` is about 3,919 lines.
  - `src/components/viewer/workbench/helpers.ts` is about 595 lines.
- Behavior-preserving refactor only: no UI, route, schema, storage, API, auth behavior, source behavior, media behavior, or persistence-shape changes.
- Goal: extract layer/selection/workbench interaction state helpers and split the remaining high-level workbench shell JSX out of `FeedWorkbench`, while keeping React state ownership, effects, side effects, refs, and toasts in `FeedWorkbench`.
- This prompt intentionally combines the next two refactor priorities so they can be handled in one branch, but each slice must stay independently verifiable.
- Do not introduce reducer rewrites, custom hook rewrites, routing changes, persistence changes, or design changes in this branch.
- Do not refactor source add/edit runtime, workspace save/open/delete internals, media rendering internals, URL/Reddit normalization internals, timer math internals, or drag math internals unless required to preserve behavior.

## Current Extracted Modules

Existing workbench modules already include:

- `src/components/viewer/workbench/types.ts`
- `src/components/viewer/workbench/helpers.ts`
- `src/components/viewer/workbench/dialogs.tsx`
- `src/components/viewer/workbench/fields.tsx`
- `src/components/viewer/workbench/source-dialogs.tsx`
- `src/components/viewer/workbench/source-add-dialog.tsx`
- `src/components/viewer/workbench/source-edit-dialog.tsx`
- `src/components/viewer/workbench/source-dialog-fields.tsx`
- `src/components/viewer/workbench/views.tsx`
- `src/components/viewer/workbench/fixed-grid-view.tsx`
- `src/components/viewer/workbench/free-grid-view.tsx`
- `src/components/viewer/workbench/session-pane.tsx`
- `src/components/viewer/workbench/url-source-pane.tsx`
- `src/components/viewer/workbench/focus-layout.tsx`
- `src/components/viewer/workbench/local-sources.ts`
- `src/components/viewer/workbench/runtime-sources.ts`
- `src/components/viewer/workbench/runtime-hydration-state.ts`
- `src/components/viewer/workbench/runtime-hydration-actions.ts`
- `src/components/viewer/workbench/source-edit-state.ts`
- `src/components/viewer/workbench/source-edit-actions.ts`
- `src/components/viewer/workbench/source-add-state.ts`
- `src/components/viewer/workbench/source-add-actions.ts`
- `src/components/viewer/workbench/workspace-state.ts`
- `src/components/viewer/workbench/workspace-actions.ts`
- `src/components/viewer/workbench/workspace-save-state.ts`
- `src/components/viewer/workbench/session-placement.ts`
- `src/components/viewer/workbench/free-layout-state.ts`
- `src/components/viewer/workbench/free-drag-state.ts`
- `src/components/viewer/workbench/fill-visible-cells-state.ts`
- `src/components/viewer/workbench/timer-actions.ts`
- `src/components/viewer/workbench/layer-state.ts`
- `src/components/viewer/workbench/account-actions.ts`
- `src/components/viewer/workbench/workbench-effect-state.ts`

## Setup

Start clean and create/claim one beads task before code:

```bash
git fetch origin
git checkout scrollable-mvp
git pull --ff-only origin scrollable-mvp
git status --short --branch

ISSUE_ID=$(bd create --title="Refactor workbench layer selection shell orchestration" --type=task --priority=2 --labels refactor,workbench --acceptance "Behavior-preserving extraction of workbench layer/selection orchestration plus shell UI components; public app/API/storage/auth interfaces unchanged; layer/source/workspace behavior unchanged; verification gates pass." --silent)
bd update "$ISSUE_ID" --claim

git switch -c refactor/workbench-layer-selection-shell
```

Run baseline before edits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx src/components/viewer/workbench/fill-visible-cells-state.test.ts
npm run e2e -- tests/e2e/home.spec.ts
```

Add focused layer/selection helper tests in Slice 1 before changing production code.

## Key Changes

Extract internal workbench layer/selection orchestration and shell UI under `src/components/viewer/workbench/`.

### Slice 1: Layer And Selection Actions

Create or extend focused helpers:

- `src/components/viewer/workbench/layer-actions.ts`
- `src/components/viewer/workbench/layer-state.ts`
- `src/components/viewer/workbench/selection-state.ts`

Move pure or setter-ready orchestration out of `FeedWorkbench` for:

- deriving active-layer sessions;
- deriving active-layer occupied free rects;
- deriving selected source only when `selectedId` explicitly matches an active-layer session;
- clearing selected/maximized/pending source state when switching layers;
- preparing add-layer state;
- preparing select-layer state;
- preparing delete-layer state through existing `deleteActiveLayerState`;
- deriving layer source/file counts;
- deriving visible fixed empty slots and available separate-source slot count when this can stay pure and small.

Keep these in `FeedWorkbench`:

- React state ownership and all setters;
- `useMemo` registration if keeping memo boundaries in the component is clearer;
- `toast` side effects;
- refs;
- source placement and source add/edit callbacks;
- workspace save/open/delete orchestration;
- JSX composition.

Keep behavior unchanged:

- adding a layer still activates the new empty layer and clears selected/maximized/pending source state;
- switching layers still clears source selection and maximized state and does not auto-select a source;
- deleting a layer still renumbers layers, chooses the correct replacement active layer, preserves remaining sessions/template boxes, clears invalid selected/maximized state, and removes stale gallery/video positions;
- inactive layers stay mounted but visually hidden;
- inactive layer timers continue advancing;
- started audio/video remains loaded across layer switches;
- duplicate-fill behavior keeps cloned timers synchronized with the source timer progress;
- selected free-layout controls appear only for an explicitly selected source on the active layer.

Add focused helper tests for:

- selecting a layer clears selected/maximized/pending state without choosing a source;
- adding a layer returns the new active layer and cleared selection state;
- deleting a middle layer keeps remaining source counts and visible content stable;
- layer stat derivation counts sources/files per layer;
- selected source derivation returns `undefined` when `selectedId` is null or belongs to an inactive layer.

Commit:

```bash
git commit -m "refactor: extract workbench layer selection actions"
```

### Slice 2: Workbench Shell UI Components

Split high-level JSX sections out of `src/components/viewer/feed-workbench.tsx` into focused presentational components while preserving `FeedWorkbench` as the state/effect owner.

Create:

- `src/components/viewer/workbench/workbench-header.tsx`
- `src/components/viewer/workbench/workspace-tabs.tsx`
- `src/components/viewer/workbench/workbench-toolbar.tsx`
- `src/components/viewer/workbench/layer-toolbar.tsx`
- `src/components/viewer/workbench/selected-free-layout-controls.tsx`
- `src/components/viewer/workbench/workbench-shell.tsx` only if it reduces prop churn without becoming a middle-man.

Move JSX for:

- app/logo/account/fullscreen header;
- workspace tab strip and rename controls;
- source/layout/save/global timer toolbar;
- layer controls, layer stats, hidden fixed-source count, and duplicate-fill button;
- selected free-layout number controls.

Keep these in `FeedWorkbench`:

- all `useState`, `useEffect`, `useMemo`, and `useCallback` ownership unless a memo is purely presentational;
- all toasts;
- all async handlers;
- all source/workspace persistence calls;
- all drag refs and pointer event listener registration;
- dialog composition unless moving a dialog wrapper clearly reduces shell prop count;
- fixed/free/focus view composition if moving it would create a large prop object or blur runtime visibility rules.

Keep behavior unchanged:

- all class names, visible text, button text, aria labels, input labels, placeholders, titles, and `data-testid` values;
- mobile-first layout, wrapping, viewport bounds, and fullscreen behavior;
- account button text/title and sign-in/account dialog behavior;
- workspace tab rename/double-click/close behavior;
- Add source, Save layout, Open layouts, Clear layout, Fill visible cells, global timer, fixed/free mode, layer add/select/delete controls;
- disabled states for layout mode, fill visible cells, add layer, delete layer, and save/template controls.

Do not create UI cards, new layout wrappers, new labels, new icons, new breakpoints, or new visual hierarchy. This is a component boundary split only.

No new tests are required for pure component file splits if existing workbench tests continue to cover the behavior. Add tests only if props encode non-trivial logic or if a behavior loses coverage during extraction.

Commit:

```bash
git commit -m "refactor: split workbench shell components"
```

## Interfaces And Constraints

- Public app/API/storage interfaces: no changes.
- No Supabase schema changes.
- No route changes.
- No auth behavior changes.
- No localStorage/sessionStorage key changes.
- No serialized workspace/session/template shape changes.
- No aria label, button text, visible UI text, input label, placeholder, title, or `data-testid` changes.
- No layout, className, breakpoint, mobile behavior, fullscreen behavior, or focus behavior changes unless required to preserve existing behavior after file splits.
- Keep `FeedWorkbench` as owner of React state, effects, side effects, toasts, refs, and top-level UI composition.
- Internal exports only: helper functions/types needed by `FeedWorkbench` or split workbench components.
- If a slice would push one new file over 800 lines or add more than 50 lines to a file already over 500 lines, split that file further in the same subsystem before continuing.
- If any slice becomes broader than layer/selection orchestration or shell JSX boundaries, stop and write a follow-up prompt instead of expanding scope.

## Brooks-Lint Guardrails

- Main Brooks-Lint risk: cognitive overload in `FeedWorkbench`, plus change propagation from mixed layer selection, workspace controls, and shell JSX.
- Do not move feature/business logic into a presentational component.
- Do not create a component that only renames props and immediately delegates to another component unless it removes real complexity from `FeedWorkbench`.
- Prefer typed prop objects only when a component needs more than 4 related props and the object has a domain name.
- Preserve local vocabulary: workspace, layer, source, selected source, active layer, template slot, fixed grid, free layout.
- Before completion, report whether `feed-workbench.tsx` shrank, whether any new shell component is over 500 lines, and whether any file remains over 800 lines.

## Privacy/Data Rules

Preserve all media persistence rules:

- Do not persist third-party runtime media.
- Do not persist media URLs, thumbnails, provider payloads, Reddit JSON, raw Reddit IDs, extracted gallery URLs, `yt-dlp` output, cookies, headers, or local object URLs.
- Reddit hidden items may remain only opaque `sha256:` hashes.
- Local uploaded file bytes may remain only in IndexedDB through existing cache behavior, with metadata-only `cacheSetId` in saved layouts.
- Free-layout templates must remain source-empty.
- URL resolver hints may remain saved as metadata, but resolved runtime media and provider payloads must remain runtime-only.
- Layer/selection/shell helpers must not introduce storage of runtime `items`, `allItems`, `urlResolution`, `localFiles`, media URLs, thumbnails, provider payloads, or local object URLs outside existing runtime-only state.

## Verification Loop

After each extraction:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench.test.tsx src/components/viewer/feed-workbench-auth.test.tsx src/components/viewer/workbench/fill-visible-cells-state.test.ts
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

- source add/edit dialogs and runtime source behavior;
- saved layout popup selection reset on each open;
- workspace tab rename/open/close behavior;
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

Add focused helper tests in Slice 1 when pure helpers encode state transitions. Do not add tests only to assert that presentational components render markup already covered by `feed-workbench.test.tsx`.

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
bd close "$ISSUE_ID" --reason "Implemented workbench layer selection shell refactor"
git status --short --branch
```

Before final response, report:

- before/after line counts for `feed-workbench.tsx`, `feed-workbench.test.tsx`, and any new shell/helper files over 300 lines;
- any file still above 800 lines and why;
- whether any large file grew;
- exact checks run and their results;
- any checks blocked and exact blocker.
