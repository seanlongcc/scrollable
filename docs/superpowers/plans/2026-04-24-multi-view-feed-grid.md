# Multi-View Feed Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-based "Feed grid" with a live multi-view workspace that defaults to fixed `2x1`, supports fixed grids up to `8x8`, free `8x8` spans, per-view timers, master controls, and maximize focus plus live satellites.

**Architecture:** Keep Reddit/local sources runtime-only in `FeedWorkbench`, add pure layout and multi-timer helpers under `src/lib/viewer`, and refactor `FeedViewer` into reusable view panes for grid cells and focus mode. UI remains client-side and uses existing shadcn primitives.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Vitest, Testing Library, Playwright.

---

## File Map

- Create `src/lib/viewer/layout.ts`: fixed grid defaults, fixed dimension validation, free 8x8 rectangle validation, collision detection, placement helpers.
- Create `src/lib/viewer/layout.test.ts`: red/green tests for `2x1`, `1-8` bounds, out-of-bounds rectangles, and collisions.
- Modify `src/lib/viewer/timer.ts`: add multi-view timer state helpers and master actions while preserving existing single timer helpers.
- Modify `src/lib/viewer/timer.test.ts`: red/green tests for master next/pause/restart and own/master timer independence.
- Create `src/components/viewer/feed-view-pane.tsx`: reusable single feed view pane for grid and maximize states.
- Modify `src/components/viewer/feed-viewer.tsx`: keep compatibility by wrapping `FeedViewPane` for standalone use.
- Modify `src/components/viewer/feed-workbench.tsx`: implement live multi-view workspace, add-source dialog, fixed/free controls, master controls, per-view controls, and maximize state.
- Modify `src/components/viewer/feed-workbench.test.tsx`: assert no initial media, default fixed `2x1`, layout controls, and maximize/focus labels.
- Modify `tests/e2e/home.spec.ts`: update home expectations from card grid to live multi-view workspace.

## Task 1: Layout Helpers

**Files:**

- Create: `src/lib/viewer/layout.ts`
- Test: `src/lib/viewer/layout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIXED_GRID,
  createFixedGrid,
  createFreeRect,
  freeRectsOverlap,
  validateFreeRects,
} from "./layout";

describe("viewer layout", () => {
  it("defaults fixed layout to 2x1 side by side", () => {
    expect(DEFAULT_FIXED_GRID).toEqual({ columns: 2, rows: 1 });
  });

  it("accepts fixed dimensions from 1 through 8", () => {
    expect(createFixedGrid(1, 8)).toEqual({ columns: 1, rows: 8 });
    expect(createFixedGrid(8, 1)).toEqual({ columns: 8, rows: 1 });
  });

  it("rejects fixed dimensions outside 1 through 8", () => {
    expect(() => createFixedGrid(0, 2)).toThrow("Grid columns must be 1-8");
    expect(() => createFixedGrid(2, 9)).toThrow("Grid rows must be 1-8");
  });

  it("rejects free rectangles outside the 8x8 canvas", () => {
    expect(() =>
      createFreeRect({ column: 8, row: 1, columnSpan: 2, rowSpan: 1 }),
    ).toThrow("Free layout rectangle must fit inside the 8x8 canvas");
  });

  it("detects free layout collisions", () => {
    const first = createFreeRect({
      column: 1,
      row: 1,
      columnSpan: 3,
      rowSpan: 3,
    });
    const second = createFreeRect({
      column: 3,
      row: 3,
      columnSpan: 2,
      rowSpan: 2,
    });
    const third = createFreeRect({
      column: 4,
      row: 1,
      columnSpan: 2,
      rowSpan: 2,
    });

    expect(freeRectsOverlap(first, second)).toBe(true);
    expect(freeRectsOverlap(first, third)).toBe(false);
    expect(() => validateFreeRects([first, second])).toThrow(
      "Free layout views cannot overlap",
    );
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/layout.test.ts`

Expected: FAIL because `src/lib/viewer/layout.ts` does not exist.

- [ ] **Step 3: Implement minimal layout helpers**

Implement exported `DEFAULT_FIXED_GRID`, `createFixedGrid`, `createFreeRect`, `freeRectsOverlap`, and `validateFreeRects` with 1-based coordinates and an 8x8 free canvas.

- [ ] **Step 4: Run test to verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/layout.test.ts`

Expected: PASS.

## Task 2: Multi-Timer Helpers

**Files:**

- Modify: `src/lib/viewer/timer.ts`
- Test: `src/lib/viewer/timer.test.ts`

- [ ] **Step 1: Write failing multi-timer tests**

Add tests for:

```ts
import {
  advanceTimerState,
  applyMasterDuration,
  createMultiTimerState,
  masterMoveTimerIndexes,
  masterRestartTimers,
  masterTogglePaused,
} from "./timer";

it("creates own timers and master timers without sharing duration", () => {
  const timers = createMultiTimerState([
    { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
    { id: "b", durationSeconds: 12, itemCount: 2, mode: "master" },
  ]);

  expect(timers.a.mode).toBe("own");
  expect(timers.a.timer.durationSeconds).toBe(9);
  expect(timers.b.mode).toBe("master");
  expect(timers.b.timer.durationSeconds).toBe(12);
});

it("master next advances all timers and preserves per-view timer duration", () => {
  const timers = createMultiTimerState([
    { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
    { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
  ]);

  const next = masterMoveTimerIndexes(timers, 1);

  expect(next.a.timer.activeIndex).toBe(1);
  expect(next.a.timer.durationSeconds).toBe(9);
  expect(next.b.timer.activeIndex).toBe(1);
  expect(next.b.timer.durationSeconds).toBe(12);
});

it("master pause and restart affect every timer state", () => {
  const timers = createMultiTimerState([
    { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
    { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
  ]);
  const advanced = {
    a: { ...timers.a, timer: advanceTimerState(timers.a.timer, 500) },
    b: { ...timers.b, timer: advanceTimerState(timers.b.timer, 500) },
  };

  expect(masterTogglePaused(advanced).a.timer.isPaused).toBe(true);
  expect(masterRestartTimers(advanced).a.timer.elapsedMs).toBe(0);
});

it("applies master duration only to views in master mode", () => {
  const timers = createMultiTimerState([
    { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
    { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
  ]);

  const next = applyMasterDuration(timers, 20);

  expect(next.a.timer.durationSeconds).toBe(9);
  expect(next.b.timer.durationSeconds).toBe(20);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/timer.test.ts`

Expected: FAIL because multi-timer exports are missing.

- [ ] **Step 3: Implement multi-timer helpers**

Add `TimerMode`, `ViewTimerState`, `MultiTimerState`, `createMultiTimerState`, `masterMoveTimerIndexes`, `masterTogglePaused`, `masterRestartTimers`, and `applyMasterDuration`.

- [ ] **Step 4: Run test to verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/lib/viewer/timer.test.ts`

Expected: PASS.

## Task 3: Multi-View UI

**Files:**

- Create: `src/components/viewer/feed-view-pane.tsx`
- Modify: `src/components/viewer/feed-viewer.tsx`
- Modify: `src/components/viewer/feed-workbench.tsx`
- Test: `src/components/viewer/feed-workbench.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Add tests asserting:

```ts
expect(
  screen.getByRole("heading", { name: "Multi-view wall" }),
).toBeInTheDocument();
expect(screen.getByLabelText("Fixed columns")).toHaveValue("2");
expect(screen.getByLabelText("Fixed rows")).toHaveValue("1");
expect(screen.getByRole("button", { name: "Master next" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
expect(container.querySelectorAll("img, video")).toHaveLength(0);
```

Also test with a mocked local upload or mocked fetch-created session that maximize shows `Focus view` and `Satellite views`.

- [ ] **Step 2: Run test to verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx`

Expected: FAIL because current workbench still renders `Feed console` and card grid.

- [ ] **Step 3: Implement reusable view pane**

Create `FeedViewPane` that renders one feed's active item/media, progress bar, title, item count, per-view controls, maximize button, timer controls, and gallery controls. It receives timer state and callbacks instead of owning all state.

- [ ] **Step 4: Refactor standalone viewer**

Keep `FeedViewer` public API intact by wrapping `FeedViewPane` with local timer state so existing callers continue to work.

- [ ] **Step 5: Implement workbench live wall**

Replace card grid with:

- live fixed/free workspace;
- default fixed `2x1`;
- add-source dialog containing existing Reddit/local controls;
- master control bar;
- fixed rows/columns controls `1-8`;
- free mode with numeric 8x8 rectangle controls for selected view;
- maximize focus + satellite mode.

- [ ] **Step 6: Run UI tests to verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx`

Expected: PASS.

## Task 4: E2E And Final Verification

**Files:**

- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Update E2E expectations**

Home should assert `Multi-view wall`, default `2x1`, `Add source`, `Master next`, and no media before runtime feeds open.

- [ ] **Step 2: Run all automated checks**

Run:

```bash
source ~/.nvm/nvm.sh
set -e
nvm use 24
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 3: Run browser verification**

Run the dev server with `source ~/.nvm/nvm.sh && nvm use 24 && npm run dev`, then inspect desktop and mobile viewports with browser tools. Verify controls are visible, default grid remains side-by-side, and no initial media renders.

- [ ] **Step 4: Commit**

```bash
git add .beads/issues.jsonl docs/superpowers/plans/2026-04-24-multi-view-feed-grid.md src/lib/viewer/layout.ts src/lib/viewer/layout.test.ts src/lib/viewer/timer.ts src/lib/viewer/timer.test.ts src/components/viewer/feed-view-pane.tsx src/components/viewer/feed-viewer.tsx src/components/viewer/feed-workbench.tsx src/components/viewer/feed-workbench.test.tsx tests/e2e/home.spec.ts
git commit -m "feat: add multi-view feed grid"
git push
bd dolt push
```
