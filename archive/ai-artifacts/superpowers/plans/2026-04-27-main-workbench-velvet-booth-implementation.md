# Main Workbench Velvet Booth Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Use subagents only when the active runtime and user instructions explicitly allow them. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the approved Velvet Booth direction to the main workbench while preserving all existing workbench behavior.

**Architecture:** Keep logic intact and make scoped visual changes in font setup, global tokens, workbench chrome, stage/grid spacing, and the design spec. Avoid adding business logic to large workbench files. Existing tests should continue to cover functionality.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, shadcn components, `next/font/google`.

---

### Task 1: Font And Token Foundation

**Files:**

- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `DESIGN.md`
- Modify: `DESIGN.json`

- [x] Replace Geist with Manrope for UI text and Azeret Mono for mono/brand text via `next/font/google`.
- [x] Update CSS font variables so `font-sans` maps to Manrope and `font-mono` maps to Azeret Mono.
- [x] Tune dark tokens toward softer black/charcoal without adding a second saturated accent.
- [x] Update `DESIGN.md` and `DESIGN.json` to record Velvet Booth, Manrope, and Azeret Mono.

### Task 2: Workbench Shell And Chrome

**Files:**

- Modify: `frontend/src/components/site-logo.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-header.tsx`
- Modify: `frontend/src/components/viewer/workbench/workspace-tabs.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-chrome.tsx`
- Modify: `frontend/src/components/viewer/workbench/fields.tsx`

- [x] Make wordmark use Azeret Mono with a slightly tighter, more private console feel.
- [x] Make desktop and mobile chrome use softer panel surfaces, restrained borders, and Manrope controls.
- [x] Preserve all current control groups: layout mode, layer stats, grid, timer, actions, selected source, playback.
- [x] Keep mobile repeated controls at least 44px where the current layout expects touch interaction.

### Task 3: Stage And Source Spacing

**Files:**

- Modify: `frontend/src/components/viewer/workbench/workbench-stage.tsx`
- Modify: `frontend/src/components/viewer/workbench/fixed-grid-view.tsx`
- Modify: `frontend/src/components/viewer/workbench/free-grid-view.tsx`
- Modify: `frontend/src/components/viewer/feed-view-pane.tsx`
- Modify: `frontend/src/components/viewer/workbench/url-source-pane.tsx`

- [x] Reduce gaps between source panes in fixed and free layouts without breaking selection outlines.
- [x] Give empty source cells a softer Velvet Booth material treatment.
- [x] Keep media panes dominant and avoid new heavy blur/animation.
- [x] Preserve hover, focus, click, selection, maximize, edit, remove, gallery, timer, local upload, URL iframe behavior.

### Task 4: Verification

**Commands:**

- `source ~/.nvm/nvm.sh && nvm use 24 && npm run format:check`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm run lint`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm run typecheck`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm test`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm run build`

- [x] Run browser verification at 393x852 and 1440x900.
- [x] Confirm no horizontal overflow.
- [x] Confirm workbench sheet still shows all current controls.
- [x] Confirm fixed grid has minimal source gaps.
- [x] Confirm no media persistence behavior changed.
