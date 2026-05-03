# Desktop Workbench Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved desktop Workbench collapse toggle so the panel minimizes to a slim rail and the source viewing area expands.

**Architecture:** `FeedWorkbench` owns one UI-only boolean and passes it to `WorkbenchChrome` and `WorkbenchStage`. `WorkbenchChrome` renders the desktop Workbench button as a true toggle and hides panel content when collapsed. `WorkbenchStage` switches only desktop left padding from full-panel spacing to slim-rail spacing.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library.

---

## File Structure

- Modify `frontend/src/components/viewer/feed-workbench.tsx`: add `isDesktopWorkbenchCollapsed` state and wire it to chrome and stage.
- Modify `frontend/src/components/viewer/workbench/workbench-chrome.tsx`: add desktop collapse props, toggle behavior, accessible labels, rail classes, and hidden panel rendering.
- Modify `frontend/src/components/viewer/workbench/workbench-stage.tsx`: accept collapse flag and switch desktop stage padding.
- Modify `frontend/src/components/viewer/feed-workbench-interactions.test.tsx`: add focused interaction test for desktop collapse accessibility and layout class change.

Brooks-Lint risk: change propagation between chrome and stage spacing. Keep the state single-purpose, keep the stage change to one class switch, and do not add persistence or source logic.

### Task 1: Red Test

**Files:**
- Modify: `frontend/src/components/viewer/feed-workbench-interactions.test.tsx`

- [ ] **Step 1: Add failing interaction test**

Add this test near the other `FeedWorkbench interactions` cases:

```tsx
  it("collapses the desktop workbench panel and expands the stage", async () => {
    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    const workbenchButton = screen.getByRole("button", {
      name: "Collapse workbench",
    });
    expect(workbenchButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Layout mode")).toBeInTheDocument();

    const stage = container.querySelector(
      '[data-testid="workbench-stage-shell"]',
    );
    expect(stage).toHaveClass("md:pl-[20.5rem]");

    await user.click(workbenchButton);

    expect(
      screen.getByRole("button", { name: "Open workbench" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Layout mode")).not.toBeInTheDocument();
    expect(stage).toHaveClass("md:pl-[5rem]");

    await user.click(screen.getByRole("button", { name: "Open workbench" }));

    expect(
      screen.getByRole("button", { name: "Collapse workbench" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Layout mode")).toBeInTheDocument();
    expect(stage).toHaveClass("md:pl-[20.5rem]");
  });
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
nvm use 24
npm test -- --run frontend/src/components/viewer/feed-workbench-interactions.test.tsx -t "collapses the desktop workbench panel and expands the stage"
```

Expected: fail because the button name is still `Workbench` and the stage test id/classes do not exist.

### Task 2: Implement Collapse Wiring

**Files:**
- Modify: `frontend/src/components/viewer/feed-workbench.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-chrome.tsx`
- Modify: `frontend/src/components/viewer/workbench/workbench-stage.tsx`

- [ ] **Step 1: Add state in `FeedWorkbench`**

Add:

```tsx
const [isDesktopWorkbenchCollapsed, setIsDesktopWorkbenchCollapsed] =
  useState(false);
```

Pass `isDesktopWorkbenchCollapsed={isDesktopWorkbenchCollapsed}` to `WorkbenchStage`.

Pass `isDesktopWorkbenchCollapsed={isDesktopWorkbenchCollapsed}` and `onDesktopWorkbenchCollapsedChange={setIsDesktopWorkbenchCollapsed}` to `WorkbenchChrome`.

- [ ] **Step 2: Add chrome props and toggle**

Add props to `WorkbenchChrome`:

```tsx
  isDesktopWorkbenchCollapsed,
  onDesktopWorkbenchCollapsedChange,
```

Add prop types:

```tsx
  isDesktopWorkbenchCollapsed: boolean;
  onDesktopWorkbenchCollapsedChange: (collapsed: boolean) => void;
```

Add derived label:

```tsx
const desktopWorkbenchButtonLabel = isDesktopWorkbenchCollapsed
  ? "Open workbench"
  : "Collapse workbench";
```

Use that label for desktop Workbench button `aria-label` and `title`, set `aria-expanded={!isDesktopWorkbenchCollapsed}`, set `aria-controls="desktop-workbench-panel"`, and toggle the boolean in `onClick`.

- [ ] **Step 3: Collapse desktop rail and hide panel content**

Use `cn` on the desktop aside:

```tsx
className={cn(
  "pointer-events-auto fixed top-16 bottom-3 left-3 z-40 hidden grid-rows-[auto_minmax(0,1fr)] gap-3 md:grid motion-reduce:transition-none",
  isDesktopWorkbenchCollapsed ? "w-14" : "w-[19rem]",
)}
```

Use `cn` on the desktop nav:

```tsx
className={cn(
  "grid w-full items-center gap-2",
  isDesktopWorkbenchCollapsed ? "grid-cols-1" : "grid-cols-3",
)}
```

Render the panel only when open:

```tsx
{!isDesktopWorkbenchCollapsed ? (
  <div id="desktop-workbench-panel" className="...">
    <WorkbenchPanelContent ... />
  </div>
) : null}
```

- [ ] **Step 4: Switch stage padding**

Add prop to `WorkbenchStage`:

```tsx
isDesktopWorkbenchCollapsed,
```

Add prop type:

```tsx
isDesktopWorkbenchCollapsed: boolean;
```

Add `data-testid="workbench-stage-shell"` to the stage shell `<section>`.

Switch classes:

```tsx
isUiHidden
  ? "p-0"
  : cn(
      "px-0 pt-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pt-16 md:pr-4 md:pb-4 motion-reduce:transition-none",
      isDesktopWorkbenchCollapsed ? "md:pl-[5rem]" : "md:pl-[20.5rem]",
    )
```

- [ ] **Step 5: Run focused test to verify green**

Run:

```bash
nvm use 24
npm test -- --run frontend/src/components/viewer/feed-workbench-interactions.test.tsx -t "collapses the desktop workbench panel and expands the stage"
```

Expected: pass.

### Task 3: Verification

**Files:**
- Modify only if verification finds issues.

- [ ] **Step 1: Run broader unit test file**

Run:

```bash
nvm use 24
npm test -- --run frontend/src/components/viewer/feed-workbench-interactions.test.tsx
```

Expected: pass.

- [ ] **Step 2: Run lint/typecheck/format check**

Run:

```bash
nvm use 24
npm run format:check
npm run lint
npm run typecheck
```

Expected: all pass.

- [ ] **Step 3: Browser verify desktop and mobile**

Run dev server:

```bash
nvm use 24
npm run dev
```

Verify desktop at `1440x900`: Workbench button collapses panel to slim rail and stage expands.

Verify mobile at iPhone 15 size: Workbench button still opens bottom sheet.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add frontend/src/components/viewer/feed-workbench.tsx frontend/src/components/viewer/workbench/workbench-chrome.tsx frontend/src/components/viewer/workbench/workbench-stage.tsx frontend/src/components/viewer/feed-workbench-interactions.test.tsx docs/superpowers/plans/2026-04-29-desktop-workbench-collapse.md
git commit -m "feat: collapse desktop workbench panel"
```
