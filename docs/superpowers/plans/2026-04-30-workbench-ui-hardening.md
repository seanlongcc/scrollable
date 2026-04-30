# Workbench UI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Scrollable's workbench UI against long text, missing browser APIs, dense controls, mobile overflow, and hidden recovery actions.

**Architecture:** Keep behavior in focused workbench components. Avoid new logic in `feed-workbench.tsx`; place browser API fallbacks in `workspace-tabs.tsx` and visual resilience in existing pane/chrome components. Preserve runtime-only media behavior and metadata-only saved surfaces.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest/jsdom, Playwright/browser verification.

---

### Task 1: Browser API Fallbacks And Selected URL Chrome

**Files:**
- Modify: `frontend/src/components/viewer/workbench/workspace-tabs.tsx`
- Modify: `frontend/src/components/viewer/workbench/url-source-pane.tsx`
- Test: `frontend/src/components/viewer/workbench/workspace-tabs.test.tsx`
- Test: `frontend/src/components/viewer/workbench/url-source-pane.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests proving `WorkspaceTabs` renders without `CSS.escape` and `ResizeObserver`, and `UrlSourcePane` keeps action chrome visible when selected.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `nvm use 24 && npm test -- workspace-tabs.test.tsx url-source-pane.test.tsx`

Expected: FAIL before implementation because tests or behavior are missing.

- [ ] **Step 3: Implement minimal fallbacks**

In `workspace-tabs.tsx`, replace direct `CSS.escape` and `ResizeObserver` usage with guarded helpers. In `url-source-pane.tsx`, make selected source chrome visible without hover.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `nvm use 24 && npm test -- workspace-tabs.test.tsx url-source-pane.test.tsx`

Expected: PASS.

### Task 2: Text, Density, And Overflow Hardening

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/viewer/feed-view-pane.tsx`
- Modify: `frontend/src/components/viewer/workbench/url-source-pane.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-panel-sections.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-chrome.tsx`
- Modify: `frontend/src/components/viewer/workbench/fixed-grid-view.tsx`
- Modify: `frontend/src/components/viewer/workbench/free-grid-view.tsx`
- Modify: `frontend/src/components/viewer/workbench/focus-layout.tsx`
- Modify: `frontend/src/components/viewer/workbench/dialogs.tsx`
- Modify: `frontend/src/components/viewer/workbench/cloud-save-dialog-parts.tsx`
- Modify: `frontend/src/components/viewer/workbench/source-add-dialog.tsx`
- Modify: `frontend/src/components/viewer/workbench/source-edit-dialog.tsx`

- [ ] **Step 1: Add a wrapping utility**

Add a small CSS utility for long URLs, unbroken CJK/emoji-heavy strings, and pasted titles.

- [ ] **Step 2: Harden pane text**

Apply the utility and `min-w-0`/scroll constraints to runtime panes, URL fallback states, metadata labels, and empty/error messages.

- [ ] **Step 3: Harden dense controls**

Make workbench action/layer controls adapt to longer labels and many options without overflowing mobile sheets or desktop rails.

- [ ] **Step 4: Harden dialogs**

Add safe-area padding, overflow containment, and wrapping to source/save/library dialogs without changing persistence behavior.

### Task 3: Verification

**Files:**
- No source changes expected unless verification exposes defects.

- [ ] **Step 1: Run formatter check**

Run: `nvm use 24 && npm run format:check`

- [ ] **Step 2: Run lint**

Run: `nvm use 24 && npm run lint`

- [ ] **Step 3: Run typecheck**

Run: `nvm use 24 && npm run typecheck`

- [ ] **Step 4: Run focused and relevant tests**

Run: `nvm use 24 && npm test -- workspace-tabs.test.tsx url-source-pane.test.tsx feed-view-pane.test.tsx`

- [ ] **Step 5: Browser verify desktop and mobile**

Start: `nvm use 24 && npm run dev`

Verify desktop and iPhone-sized viewport for workbench load, mobile sheet bounds, source/url panes, dialogs, and no console errors.

### Self-Review

- Spec coverage: full UI hardening maps to Tasks 1-3.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: all referenced files exist in the current frontend workspace.
