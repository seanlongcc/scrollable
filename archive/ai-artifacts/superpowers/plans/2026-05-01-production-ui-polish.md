# Production UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the existing Scrollable workbench UI for production without changing persistence, runtime media behavior, or source semantics.

**Architecture:** Keep the polish in existing presentation components and shared dialog class constants. The pass aligns chrome, empty slots, workbench panels, and core dialogs to the `DESIGN.md` black-plum, oxblood, champagne system while avoiding new state or data flow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react.

---

### Task 1: Shared Dialog And Library Surface Polish

**Files:**
- Modify: `frontend/src/components/viewer/workbench/dialog-styles.ts`
- Modify: `frontend/src/components/viewer/workbench/layout-library-dialog.tsx`
- Modify: `frontend/src/components/viewer/workbench/save-layout-dialog.tsx`
- Modify: `frontend/src/components/viewer/workbench/account-dialog.tsx`
- Modify: `frontend/src/components/viewer/workbench/local-cache-dialogs.tsx`

- [ ] Tighten shared dialog classes so bottom sheets and desktop popovers use the same radius, border, surface opacity, and shadow vocabulary.
- [ ] Reduce one-off rounded `2xl` controls in dialog rows to the design-system `xl` shape.
- [ ] Keep saved layout/library surfaces metadata-only. Do not add third-party previews, media URLs, raw IDs, thumbnails, or runtime payloads.

### Task 2: Workbench Chrome And Empty Stage Polish

**Files:**
- Modify: `frontend/src/components/viewer/workbench/workbench-chrome.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-panel.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-panel-sections.tsx`
- Modify: `frontend/src/components/viewer/workbench/fixed-grid-view.tsx`

- [ ] Make desktop rail and panel feel like compact instrument chrome: flatter panels, lighter shadows, stable `xl` radii, and clearer active state.
- [ ] Make mobile floating rail and bottom navigation visually consistent with the same surface, border, and touch target vocabulary.
- [ ] Promote "Add source" as the primary panel action, keep destructive and metadata actions visually secondary.
- [ ] Polish empty fixed-grid cells so empty slots feel intentional, with stronger focus-visible/hover feedback and no layout shift.

### Task 3: Source Add Dialog Polish

**Files:**
- Modify: `frontend/src/components/viewer/workbench/source-add-dialog.tsx`

- [ ] Align local, Reddit, URL, and grouping sections to the shared dialog panel vocabulary.
- [ ] Preserve all existing labels, aria labels, source grouping behavior, drag/drop behavior, and loading state behavior.
- [ ] Keep visible copy terse and avoid implying Scrollable persists third-party media.

### Task 4: Verification

**Files:**
- Verify only, no new test files expected for visual-only polish.

- [ ] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run format:check`.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run lint`.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 24 && npm run typecheck`.
- [ ] Capture mobile and desktop screenshots from `http://localhost:3000`.
- [ ] Check `git status --short --branch`.
