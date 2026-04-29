# Local Folder Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local folder upload option that reuses existing local upload runtime and cache behavior.

**Architecture:** Add a second hidden file input in `SourceDialog` with directory selection attributes. Route its `onChange` to the existing `addLocalFiles` handler so filtering, grouping, caching, object URL creation, slot limits, and metadata-only persistence remain unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Testing Library, Vitest, shadcn input/button primitives.

---

### Task 1: Folder Input Behavior

**Files:**

- Modify: `src/components/viewer/feed-workbench.test.tsx`
- Modify: `src/components/viewer/feed-workbench.tsx`

- [ ] **Step 1: Write failing tests**

Add tests in `src/components/viewer/feed-workbench.test.tsx`:

```tsx
it("offers local folder upload with directory selection attributes", async () => {
  const user = userEvent.setup();
  render(<FeedWorkbench />);

  await user.click(screen.getByRole("button", { name: "Add source" }));

  const folderInput = screen.getByLabelText("Image/video folder");
  expect(folderInput).toHaveAttribute("type", "file");
  expect(folderInput).toHaveAttribute("webkitdirectory");
  expect(folderInput).toHaveAttribute("directory");
  expect(folderInput).toHaveAttribute("multiple");
});

it("adds a selected local folder as one stacked source", async () => {
  stubObjectUrls();
  stubRandomUuids(["workspace-1", "local-1", "local-2", "session-1"]);

  const user = userEvent.setup();
  render(<FeedWorkbench />);

  await user.click(screen.getByRole("button", { name: "Add source" }));
  await user.upload(screen.getByLabelText("Image/video folder"), [
    new File(["a"], "folder-a.png", { type: "image/png" }),
    new File(["b"], "folder-b.mp4", { type: "video/mp4" }),
  ]);

  expect(
    screen.getByText("1 source active · Fixed layout"),
  ).toBeInTheDocument();
  expect(await screen.findByAltText("folder-a.png")).toBeInTheDocument();
  expect(screen.getAllByText("folder-b.mp4").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx
```

Expected: fails because `Image/video folder` input is missing.

- [ ] **Step 3: Implement folder input**

Add a folder picker label in `SourceDialog` next to the existing file picker. Use a normal input element so TypeScript can receive directory attributes through a local prop type if needed. Keep `onChange={addLocalFiles}`.

- [ ] **Step 4: Verify green**

Run:

```bash
nvm use 24 && npm test -- src/components/viewer/feed-workbench.test.tsx
```

Expected: the new tests pass with the existing local upload tests.

- [ ] **Step 5: Run completion checks**

Run:

```bash
nvm use 24 && npm run typecheck
nvm use 24 && npm run lint
nvm use 24 && npm run format:check
```

Expected: all commands exit 0.
