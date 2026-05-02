# Viewer Workbench Handler And URL Source Ownership Refactor With Continuous Verification

## Summary

- Start from clean `scrollable-mvp` after `refactor/workbench-test-ownership` is merged.
- Current line counts to verify before editing:
  - `src/components/viewer/feed-workbench.tsx` is about 1,900 lines.
  - `src/components/viewer/workbench/helpers.ts` is about 595 lines.
  - `src/lib/url-source/gallery.ts` is about 866 lines.
  - `src/lib/url-source/resolver.ts` is about 777 lines.
  - `src/lib/url-source/resolver.test.ts` is about 736 lines.
  - `src/components/viewer/workbench/source-edit-dialog.tsx` is about 455 lines.
  - `src/components/viewer/workbench/dialogs.tsx` is about 449 lines.
  - `src/components/viewer/workbench/source-add-dialog.tsx` is about 385 lines.
  - `src/components/viewer/workbench/runtime-sources.ts` is about 407 lines.
- Behavior-preserving production refactor: no UI behavior, route, schema, storage, API, auth behavior, source behavior, media behavior, persistence shape, or user-facing behavior changes.
- Goal: split remaining oversized workbench orchestration and URL source modules into focused ownership boundaries so future feature work lands in the smallest module that owns the behavior.
- Include all next refactor areas in one branch: workbench handler wiring, workbench JSX composition, `helpers.ts` ownership, URL resolver ownership, and gallery resolver ownership.
- Do not add features, providers, UI states, copy, or product assertions unless a moved helper requires equivalent regression coverage to preserve behavior.

## Current Refactor Problem

`feed-workbench.tsx` still owns too many responsibilities:

- source add/edit runtime orchestration;
- local upload cache and object URL orchestration;
- workspace save/open/delete/tab/session-store orchestration;
- layout mode, fixed grid, free layout drag, timer, gallery, layer, and clear-layout handlers;
- account sign-out and account sync save side effects;
- runtime hydration side effects;
- a large JSX return tree that assembles header, dialogs, focus view, fixed grid layers, and free grid layers.

`workbench/helpers.ts` mixes unrelated helper domains:

- workspace serialization/runtime conversion;
- Reddit URL, listing, hash, title, and label helpers;
- keyboard helpers;
- workspace naming and duplicate detection;
- saved layout display counts and layer summaries;
- URL iframe/provider display helpers.

`src/lib/url-source/resolver.ts` mixes resolver orchestration with:

- direct media extension and MIME detection;
- provider detection and embed URL building;
- gallery, Hitomi, social, YouTube, and `yt-dlp` provider routing;
- metadata and iframe fallback resolution;
- HTML metadata parsing.

`src/lib/url-source/gallery.ts` mixes:

- gallery adapter routing;
- site-specific extractors;
- network fetch wrappers;
- HTML parsing helpers;
- Hitomi routing and URL construction;
- nHentai API parsing;
- generic URL/path/string utilities.

Brooks-Lint risk: cognitive overload, change propagation, knowledge duplication, and dependency disorder across workbench and URL runtime source ownership.

## Current Test Ownership

The workbench integration tests should already be split by the prior test ownership refactor. Expected focused tests include:

- `src/components/viewer/feed-workbench.test.tsx`
- `src/components/viewer/feed-workbench-auth.test.tsx`
- `src/components/viewer/feed-workbench-sources.test.tsx`
- `src/components/viewer/feed-workbench-reddit-inputs.test.tsx`
- `src/components/viewer/feed-workbench-reddit-persistence.test.tsx`
- `src/components/viewer/feed-workbench-workspaces.test.tsx`
- `src/components/viewer/feed-workbench-templates.test.tsx`
- `src/components/viewer/feed-workbench-local-uploads.test.tsx`
- `src/components/viewer/feed-workbench-layers.test.tsx`
- `src/components/viewer/feed-workbench-interactions.test.tsx`
- `src/components/viewer/feed-workbench-test-utils.tsx`

Existing URL source tests include:

- `src/lib/url-source/resolver.test.ts`
- `src/lib/url-source/gallery.test.ts`
- `src/lib/url-source/validation.test.ts`
- `src/lib/url-source/ytdlp.test.ts`

Do not weaken assertions, remove privacy checks, rename visible expectations, or move helper-level tests into broad integration files.

## Setup

Start clean and create/claim one beads task before code:

```bash
git fetch origin
git checkout scrollable-mvp
git pull --ff-only origin scrollable-mvp
git status --short --branch

ISSUE_ID=$(bd create --title="Refactor workbench handler and URL source ownership" --type=task --priority=2 --labels refactor,workbench,url-source --acceptance "Behavior-preserving split of FeedWorkbench handler/JSX ownership, workbench helpers, URL resolver, and gallery resolver into focused modules; public app/API/storage/auth/media behavior unchanged; verification gates pass." --silent)
bd update "$ISSUE_ID" --claim

git switch -c refactor/workbench-handler-url-source-ownership
```

Run baseline before edits:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e -- tests/e2e/home.spec.ts
```

If the split workbench test files are not present, stop. The test ownership refactor must be merged first.

## Key Changes

### Slice 1: Workbench Source And Runtime Handler Ownership

Move source/runtime orchestration out of `feed-workbench.tsx` while keeping `FeedWorkbench` as the React state owner.

Create focused helper/action modules only as needed:

- `src/components/viewer/workbench/source-runtime-handlers.ts`
- `src/components/viewer/workbench/session-runtime-handlers.ts`

Move or wrap the logic currently embedded in these `feed-workbench.tsx` handlers:

- `fetchRedditFeed`;
- `openUrlSource`;
- `addLocalFiles`;
- `addDroppedLocalFiles`;
- `allowLocalFileDrop`;
- `addLocalFileList`;
- `replaceLocalSessionFiles`;
- `cacheLocalFiles`;
- `applyLocalRuntimeItems`;
- `createLocalRuntimeItems`;
- `addSession`;
- `addSessions`;
- `openSourcePanel`;
- `resetSourceInputs`;
- `openEditSource`;
- `saveRedditSourceEdit`;
- `saveUrlSourceEdit`;
- `saveLocalSourceEdit`;
- `hydrateRuntimeItems`.

Keep in `feed-workbench.tsx` only thin event wrappers and setter calls that are clearer in the component. Prefer helper functions that accept typed input objects and return setter-ready results. Do not pass more than four positional parameters to new helpers.

Keep behavior unchanged:

- loading state timing must remain equivalent;
- toasts must use the same messages;
- source dialog close/reset behavior must remain equivalent;
- local cache rejection must still warn without persisting object URLs;
- runtime hydration must not persist third-party media or raw provider payloads.

Commit:

```bash
git commit -m "refactor: split workbench source runtime handlers"
```

### Slice 2: Workbench Workspace And Save Handler Ownership

Move workspace/save orchestration out of `feed-workbench.tsx`.

Create focused helper/action modules only as needed:

- `src/components/viewer/workbench/workspace-handler-actions.ts`
- `src/components/viewer/workbench/workspace-sync-actions.ts`

Move or wrap the logic currently embedded in these handlers:

- `openSaveDialog`;
- `saveLayoutAs`;
- `saveTemplateAs`;
- `persistCurrentWorkspace`;
- `persistCurrentTemplate`;
- `currentWorkspaceState`;
- `createWorkspaceTab`;
- `selectWorkspace`;
- `beginWorkspaceRename`;
- `commitWorkspaceRename`;
- `closeWorkspaceTab`;
- `openSavedWorkspaces`;
- `openSavedTemplates`;
- `deleteSavedWorkspace`;
- `deleteSavedTemplate`;
- `applyWorkspaceSnapshot`.

Keep behavior unchanged:

- localStorage/sessionStorage keys and serialized workspace/session/template shapes must not change;
- saved layouts must remain metadata-only for third-party sources;
- saved local uploads must store metadata-only cache references;
- free-layout templates must remain source-empty;
- Supabase upsert row shape and auth behavior must not change;
- toast messages must remain equivalent.

Commit:

```bash
git commit -m "refactor: split workbench workspace handlers"
```

### Slice 3: Workbench Layout, Layer, Timer, And Drag Handler Ownership

Move layout/layer/timer/free-drag orchestration out of `feed-workbench.tsx`.

Create focused helper/action modules only as needed:

- `src/components/viewer/workbench/layout-handler-actions.ts`
- `src/components/viewer/workbench/session-handler-actions.ts`

Move or wrap the logic currently embedded in these handlers:

- `updateFixedGrid`;
- `changeLayoutMode`;
- `updateSession`;
- `removeSession`;
- `updateFreeRect`;
- `updateTemplateSlotRect`;
- `removeTemplateSlot`;
- `beginFreeDrag`;
- `changeGallery`;
- `setGlobalTimerSeconds`;
- `setViewTimerSeconds`;
- `setViewTimerMode`;
- `runGlobalAction`;
- `fillVisibleCells`;
- `addLayer`;
- `selectLayer`;
- `deleteActiveLayer`;
- `clearCurrentLayout`;
- `signOut`.

Prefer extending existing focused modules when ownership already exists:

- timer logic belongs near `timer-actions.ts`;
- layer state belongs near `layer-actions.ts`;
- free-layout geometry belongs near `free-layout-state.ts` and `free-drag-state.ts`;
- selection/session display ownership belongs near `selection-state.ts`.

Keep behavior unchanged:

- layout mode lock must still block switching when sources or template boxes exist;
- grid validation errors must keep the same user-visible messages;
- layer deletion must preserve current gallery/video cleanup behavior;
- inactive layer timers must keep advancing as before;
- keyboard, wheel, timer, and fullscreen behavior must remain equivalent.

Commit:

```bash
git commit -m "refactor: split workbench layout handlers"
```

### Slice 4: Workbench JSX Composition Ownership

Shrink the JSX return tree in `feed-workbench.tsx` without changing markup behavior.

Create focused components only as needed:

- `src/components/viewer/workbench/hidden-ui-reveal-button.tsx`
- `src/components/viewer/workbench/workbench-overlays.tsx`
- `src/components/viewer/workbench/workbench-stage.tsx`

Move JSX composition for:

- hidden UI reveal button;
- source/layout/save/clear/edit/account dialogs;
- focus layout vs standard layout stage;
- fixed-grid layer map;
- free-grid layer map;
- layout status row and selected free-layout controls.

Keep behavior unchanged:

- do not change className strings, visible text, aria labels, titles, placeholders, `data-testid`s, focus behavior, responsive classes, or layout mode conditions;
- do not put UI cards inside cards or alter mobile-first layout;
- keep prop names domain-oriented and avoid boolean prop proliferation where existing components already express the state clearly.

Commit:

```bash
git commit -m "refactor: split workbench JSX composition"
```

### Slice 5: Workbench Helper Ownership

Split `src/components/viewer/workbench/helpers.ts` by domain. Keep imports stable with a small compatibility barrel only if that avoids noisy multi-file churn.

Create focused helper files:

- `src/components/viewer/workbench/workspace-transform-helpers.ts`
- `src/components/viewer/workbench/reddit-source-helpers.ts`
- `src/components/viewer/workbench/workspace-name-helpers.ts`
- `src/components/viewer/workbench/session-display-helpers.ts`
- `src/components/viewer/workbench/keyboard-helpers.ts`

Move helper ownership:

- workspace transforms: `toRuntimeWorkspace`, `toRuntimeWorkspaceWithLocalRuntime`, `workspaceFromTemplate`, `resolveWorkspaceGlobalSeconds`, `toMultiTimerState`;
- Reddit helpers: `normalizeRedditLimit`, `splitRedditUrls`, `buildSubredditListingUrls`, `buildSubredditListingUrl`, `normalizeSubredditName`, Reddit hidden item hash helpers, runtime labels, Reddit title/subreddit helpers;
- workspace names: `createId`, `nextLayoutName`, `uniqueWorkspaceName`, duplicate name checks, layout name normalization/limit helpers;
- display helpers: file counts, layer summaries, playable/runtime checks, iframe URL checks, URL host labels;
- keyboard helpers: keyboard movement and editing target detection;
- generic `clamp` should live with the smallest domain that still uses it, or in a tiny local helper module if multiple domains require it.

After the split, `helpers.ts` may remain as a compatibility barrel, but it must stay under 120 lines and contain re-exports only. Prefer updating imports to focused files when doing so touches no more than three related modules in the current slice.

Keep behavior unchanged:

- Reddit hash inputs and `sha256:` output must remain byte-for-byte equivalent;
- saved layout/template name normalization must remain equivalent;
- iframe/provider display warnings must remain equivalent;
- no runtime media, thumbnails, provider payloads, raw Reddit IDs, or local object URLs may be persisted.

Commit:

```bash
git commit -m "refactor: split workbench helper ownership"
```

### Slice 6: URL Resolver Ownership

Split `src/lib/url-source/resolver.ts` into focused resolver modules while keeping `resolveUrlSource` as the public entrypoint.

Create focused modules only as needed:

- `src/lib/url-source/direct-media.ts`
- `src/lib/url-source/provider-embeds.ts`
- `src/lib/url-source/metadata-resolver.ts`
- `src/lib/url-source/iframe-resolver.ts`
- `src/lib/url-source/resolver-routing.ts`

Move ownership:

- direct media extension, MIME, HEAD detection, and runtime media construction to `direct-media.ts`;
- YouTube, Instagram, TikTok, Twitter/X, gallery provider, Hitomi provider, social provider detection, and embed URL building to `provider-embeds.ts`;
- HTML metadata fetching/parsing and title extraction to `metadata-resolver.ts`;
- iframe fallback, `x-frame-options` and CSP frame checks to `iframe-resolver.ts`;
- hint-to-resolver ordering and provider category checks to `resolver-routing.ts`;
- keep `resolver.ts` as orchestration and public `resolveUrlSource` entrypoint.

Keep behavior unchanged:

- resolver hint precedence must stay equivalent;
- direct media HLS/audio/video/image detection must stay equivalent;
- provider warning vs direct embed behavior must stay equivalent;
- Reddit URLs must still route to Reddit runtime resolver, not iframe fallback;
- extracted gallery image URLs, stream URLs, thumbnails, cookies, headers, API keys, raw HTML/JSON, and raw `yt-dlp` output must remain runtime-only.

Commit:

```bash
git commit -m "refactor: split URL resolver ownership"
```

### Slice 7: Gallery Resolver Ownership

Split `src/lib/url-source/gallery.ts` into focused gallery modules while keeping `extractGalleryRuntimeItems` as the public entrypoint.

Create focused modules only as needed:

- `src/lib/url-source/gallery-types.ts`
- `src/lib/url-source/gallery-network.ts`
- `src/lib/url-source/gallery-html.ts`
- `src/lib/url-source/gallery-nhentai.ts`
- `src/lib/url-source/gallery-hitomi.ts`
- `src/lib/url-source/gallery-adapters.ts`
- `src/lib/url-source/gallery-utils.ts`

Move ownership:

- shared gallery types/context/extraction shape to `gallery-types.ts`;
- fetch text/json/html helpers and API key headers to `gallery-network.ts`;
- HTML scraping helpers to `gallery-html.ts`;
- nHentai API and page extraction to `gallery-nhentai.ts`;
- Hitomi routing, gallery info, shard/path logic, and asset URL construction to `gallery-hitomi.ts`;
- IMHentai, HentaiFox, HentaiNexus, HentaiRead, Akuma, and E-Hentai extractors plus adapter routing to `gallery-adapters.ts`;
- generic URL/path/string/hash helpers to `gallery-utils.ts`;
- keep `gallery.ts` as orchestration and public `extractGalleryRuntimeItems` entrypoint.

Keep behavior unchanged:

- supported provider host list must not change;
- max item behavior must stay equivalent;
- nHentai API key must remain server-only through `NHENTAI_API_KEY`;
- network failures and unsupported galleries must continue returning empty arrays;
- extracted gallery URLs must remain runtime-only and must not be persisted.

Commit:

```bash
git commit -m "refactor: split gallery resolver ownership"
```

## Interfaces And Constraints

- Public app/API/storage interfaces: no changes.
- No Supabase schema changes.
- No route changes.
- No auth behavior changes.
- No localStorage/sessionStorage key changes.
- No serialized workspace/session/template shape changes.
- No visible UI text, aria label, button text, input label, placeholder, title, `data-testid`, className, breakpoint, layout, mobile behavior, fullscreen behavior, or focus behavior changes.
- No URL resolver wire-shape changes.
- No gallery provider behavior changes.
- No broad snapshots.
- Do not add new dependencies.
- If a file would remain over 800 lines after its slice, split it further before committing that slice unless the remaining file is a pure test file with a documented reason.
- If a new helper/component file would exceed 500 lines, split it before committing.
- If more than three unrelated modules need import updates for one slice, stop and narrow the slice.

## Brooks-Lint Guardrails

- Main Brooks-Lint risk: cognitive overload and change propagation across oversized orchestration modules.
- Keep React components responsible for state ownership, effects, side-effect boundaries, handler wiring, and composing views.
- Move validation, state transitions, payload building, URL/provider parsing, placement, timer math, drag math, and runtime orchestration into focused helpers.
- Prefer extending existing focused modules over creating new generic abstractions.
- Helper names should describe domain behavior, not implementation mechanics.
- Do not create a single `controllers.ts`, `utils.ts`, or `handlers.ts` catch-all.
- Before completion, report whether `feed-workbench.tsx`, `helpers.ts`, `resolver.ts`, and `gallery.ts` shrank, whether any target file remains above 800 lines, and whether any new file is above 500 lines.

## Privacy/Data Rules

Preserve all media persistence constraints:

- Never persist third-party media URLs, thumbnails, raw provider payloads, raw Reddit IDs, raw `yt-dlp` JSON, extracted gallery URLs, stream URLs, cookies, headers, or API keys.
- Saved layouts/templates must remain metadata-only for third-party sources.
- Saved Reddit hidden items must remain opaque `sha256:` hashes only.
- Saved local uploads may store metadata-only `cacheSetId` references; local object URLs and absolute file paths must not be persisted.
- URL resolver hints may be saved, but resolved runtime media/provider payloads must remain runtime-only.
- nHentai API key must remain server-only and never appear in `NEXT_PUBLIC_*`, client code, saved config, logs, or tests.

## Verification Loop

After each slice:

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run typecheck
npm test -- src/components/viewer/feed-workbench*.test.tsx src/components/viewer/workbench/*.test.ts src/lib/url-source/resolver.test.ts src/lib/url-source/gallery.test.ts src/lib/url-source/ytdlp.test.ts src/lib/url-source/validation.test.ts
npm run lint
npm run format:check
git diff --check
```

If `format:check` fails only due to moved code formatting:

```bash
npm run format
```

Then rerun the same full slice gate before committing.

If UI composition changed in the slice, also run:

```bash
npm run e2e -- tests/e2e/home.spec.ts
```

If any check fails:

- Stop new refactor work.
- Fix only the latest owned move/import/setup change.
- Rerun the same gate.
- Continue only after green.

## Test Scenarios

All existing scenarios must continue passing:

- workbench smoke, account, source/runtime, Reddit input, Reddit persistence, workspace, template, local upload, layer, and interaction tests;
- URL direct media, provider, social iframe warning, resolver hint, metadata, iframe fallback, gallery, and `yt-dlp` behavior;
- Reddit hidden item hash privacy;
- local upload cache and object URL lifecycle;
- saved layout/template metadata-only persistence;
- keyboard, wheel, timer, fullscreen, focus, fixed grid, free layout, drag, and layer behavior;
- mobile and desktop e2e home flows.

Do not add tests only to prove files were split. Add or move tests only when a lower-level helper extraction needs focused coverage to preserve equivalent behavior.

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
bd close "$ISSUE_ID" --reason "Implemented workbench handler and URL source ownership refactor"
git status --short --branch
```

Before final response, report:

- before/after line counts for `feed-workbench.tsx`, `helpers.ts`, `resolver.ts`, `gallery.ts`, and every new file over 300 lines;
- any production file still above 800 lines and why;
- whether any large production file grew;
- exact checks run and their results;
- any checks blocked and exact blocker.
