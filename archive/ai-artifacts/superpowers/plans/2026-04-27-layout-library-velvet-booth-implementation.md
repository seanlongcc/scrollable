# Layout Library Velvet Booth Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Use subagents only when the active runtime and user instructions explicitly allow them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Velvet Booth visual language to layout library and save dialogs without changing saved layout behavior.

**Architecture:** Keep all selection, open, delete, save, template, and cache logic inside `dialogs.tsx` unchanged. Make visual-only class changes to dialog shells, section labels, rows, tabs, and metadata blocks. Preserve metadata-only saved layout rendering, with no media previews.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, shadcn UI primitives, lucide-react icons.

---

### Task 1: Library Dialog Shell

**Files:**

- Modify: `frontend/src/components/viewer/workbench/dialogs.tsx`

- [x] Restyle the Library dialog shell as a Velvet Booth surface: rounded-3xl mobile sheet, rounded-2xl desktop panel, softer borders, `bg-surface`, and heavier overlay lift.
- [x] Make the Library title use a stronger Manrope weight and keep the accessible description unchanged.
- [x] Keep desktop placement anchored to the left rail.

### Task 2: Layout Rows And Metadata

**Files:**

- Modify: `frontend/src/components/viewer/workbench/dialogs.tsx`

- [x] Restyle open layout rows, saved layout rows, and saved template rows as compact metadata strips.
- [x] Use Azeret Mono only for stats and section labels.
- [x] Keep checkboxes, delete buttons, labels, and accessible names unchanged.
- [x] Keep saved layouts metadata-only: no thumbnails, media URLs, provider payloads, or previews.

### Task 3: Save And Cache Dialog Tone

**Files:**

- Modify: `frontend/src/components/viewer/workbench/dialogs.tsx`

- [x] Apply the same dialog shell and metadata-block language to Save layout, Clear layout, local cache warning, local cache full, and Account dialogs where they share layout library surfaces.
- [x] Keep all form labels, submit buttons, errors, local cache copy, and destructive actions functionally unchanged.

### Task 4: Verification

**Commands:**

- `source ~/.nvm/nvm.sh && nvm use 24 && npm run format:check`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm run lint`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm run typecheck`
- `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- frontend/src/components/viewer/feed-workbench-workspaces.test.tsx`
- Browser verification at 393x852 and 1261x1277.

- [x] Confirm Library opens on mobile and desktop.
- [x] Confirm no horizontal overflow.
- [x] Confirm saved layout list still exposes checkboxes and delete buttons.
- [x] Confirm Save layout dialog still exposes Layout name and Save as layout.
