import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LayoutDialog } from "./dialogs";
import type { SerializedWorkspace, SerializedWorkspaceTemplate } from "./types";

describe("LayoutDialog open target", () => {
  it("lets saved layouts and templates open into the current tab", async () => {
    const user = userEvent.setup();
    const onOpenWorkspaces = vi.fn();
    const onOpenTemplates = vi.fn();

    renderLayoutDialog({
      localWorkspaces: [workspace("local-layout", "Local wall")],
      localTemplates: [template("local-template", "Poster wall")],
      onOpenWorkspaces,
      onOpenTemplates,
    });

    const dialog = screen.getByRole("dialog", { name: "Library" });
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Select Local wall" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Open selected layouts" }),
    );

    expect(onOpenWorkspaces).toHaveBeenCalledWith(
      ["local-layout"],
      "current-tab",
    );

    await user.click(within(dialog).getByRole("tab", { name: "Templates" }));
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Select Poster wall" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Open selected templates" }),
    );

    expect(onOpenTemplates).toHaveBeenCalledWith(
      ["local-template"],
      "current-tab",
    );
  });

  it("defaults library opens to the current tab and lists that option first", () => {
    renderLayoutDialog({
      localWorkspaces: [workspace("local-layout", "Local wall")],
    });

    const dialog = screen.getByRole("dialog", { name: "Library" });
    const currentTab = within(dialog).getByRole("button", {
      name: "Current tab",
    });
    const newTab = within(dialog).getByRole("button", { name: "New tab" });

    expect(currentTab).toHaveAttribute("aria-pressed", "true");
    expect(
      currentTab.compareDocumentPosition(newTab) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

function renderLayoutDialog({
  localWorkspaces = [],
  localTemplates = [],
  onOpenWorkspaces = vi.fn(),
  onOpenTemplates = vi.fn(),
}: {
  localWorkspaces?: SerializedWorkspace[];
  localTemplates?: SerializedWorkspaceTemplate[];
  onOpenWorkspaces?: (ids: string[], target: "current-tab" | "new-tab") => void;
  onOpenTemplates?: (ids: string[], target: "current-tab" | "new-tab") => void;
}) {
  return render(
    <LayoutDialog
      open
      onOpenChange={vi.fn()}
      localWorkspaces={localWorkspaces}
      cloudWorkspaces={[]}
      localTemplates={localTemplates}
      cloudTemplates={[]}
      storageTarget="local"
      onStorageTargetChange={vi.fn()}
      onOpenWorkspaces={onOpenWorkspaces}
      onOpenTemplates={onOpenTemplates}
      onDeleteWorkspace={vi.fn()}
      onDeleteTemplate={vi.fn()}
      onUploadWorkspaceToCloud={vi.fn()}
      onUploadTemplateToCloud={vi.fn()}
      onShareCloudItem={vi.fn()}
      onExportJson={vi.fn()}
      onImportJson={vi.fn()}
      workspaceTabs={[{ id: "active", name: "Active" }]}
      openWorkspaceStats={{ active: { sourceCount: 0, fileCount: 0 } }}
      activeWorkspaceId="active"
      onSelectWorkspace={vi.fn()}
      onCreateWorkspaceTab={vi.fn()}
      onCloseWorkspaceTab={vi.fn()}
      onSaveCurrentLayout={vi.fn()}
    />,
  );
}

function workspace(id: string, name: string): SerializedWorkspace {
  return {
    id,
    name,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    layoutMode: "fixed",
    fixedGrid: { columns: 2, rows: 1 },
    globalTimerSeconds: 10,
    sessions: [],
    updatedAt: "2026-04-28T00:00:00.000Z",
  };
}

function template(id: string, name: string): SerializedWorkspaceTemplate {
  return {
    id,
    name,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    globalTimerSeconds: 10,
    slots: [
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
      },
    ],
    updatedAt: "2026-04-28T00:00:00.000Z",
  };
}
