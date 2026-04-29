# Layout Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add up to three stacked source layers to saved viewer layouts, plus local audio upload support.

**Architecture:** Extend workspace metadata with `layers`, `activeLayerId`, and per-session `layerId`. Keep one shared fixed/free geometry per workspace, but compute active-layer placement independently so sources can overlap across layers. Render all layers together while only the active layer exposes edit controls.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest/jsdom, existing shadcn UI primitives.

---

### Task 1: Workspace Layer Metadata

**Files:**

- Modify: `src/lib/viewer/workspaces.ts`
- Test: `src/lib/viewer/workspaces.test.ts`

- [x] Write failing tests proving new workspaces get `Layer 1`, serialized workspaces keep `layers` and `activeLayerId`, sessions keep `layerId`, and runtime media payloads remain excluded.
- [x] Implement `WorkspaceLayer`, `MAX_WORKSPACE_LAYERS`, `DEFAULT_WORKSPACE_LAYERS`, `normalizeWorkspaceLayers`, and layer-aware `serializeWorkspace`.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/workspaces.test.ts`.

### Task 2: Layer UI And Rendering

**Files:**

- Modify: `src/components/viewer/feed-workbench.tsx`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [x] Write failing tests for adding/deleting layers, selecting a layer, assigning newly added sources to the active layer, and showing per-layer source/file counts.
- [x] Add `layers` and `activeLayerId` state to `FeedWorkbench`.
- [x] Make active-layer sessions drive placement availability, free-rect validation, duplication, and selection.
- [x] Render fixed/free sessions stacked by layer and hide inactive-layer editing chrome.
- [x] Persist and restore layer metadata from local/account layout snapshots.
- [x] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx`.

### Task 3: Local Audio Uploads

**Files:**

- Modify: `src/lib/feed/types.ts`
- Modify: `src/lib/local-uploads/object-urls.ts`
- Modify: `src/components/viewer/media-renderer.tsx`
- Modify: `src/components/viewer/feed-workbench.tsx`
- Test: `src/lib/local-uploads/object-urls.test.ts`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [x] Write failing tests proving audio files become `audio` runtime media and upload inputs accept `audio/*`.
- [x] Extend `RuntimeMedia` to include `audio`.
- [x] Detect audio MIME types in `LocalObjectUrlRegistry`.
- [x] Render audio with an `<audio>` element using runtime object URLs.
- [x] Run focused Vitest coverage for object URL and workbench behavior.

### Task 4: Documentation And Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/media-persistence.md`
- Modify: `AGENTS.md`
- Create: `docs/superpowers/specs/2026-04-24-layout-layers-design.md`
- Create: `docs/superpowers/plans/2026-04-24-layout-layers.md`

- [x] Document layer metadata and local audio upload persistence rules.
- [x] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Run browser/mobile verification for the layer controls.
