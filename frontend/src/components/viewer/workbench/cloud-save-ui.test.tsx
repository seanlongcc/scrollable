import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AccountDialog,
  LayoutDialog,
  SaveLayoutDialog,
  ShareLinkDialog,
} from "./dialogs";
import type { AccountState, SerializedWorkspace } from "./types";

describe("cloud save UI", () => {
  it("keeps Cloud selected and allows saving when local files become empty boxes", async () => {
    const user = userEvent.setup();
    const onSaveTargetChange = vi.fn();
    const onSaveLayout = vi.fn();

    render(
      <SaveLayoutDialog
        open
        onOpenChange={vi.fn()}
        name="Local wall"
        layoutMode="fixed"
        saveKind="layout"
        saveTarget="cloud"
        error={null}
        localCacheStatus={null}
        account={signedInAccount()}
        cloudUsage={cloudUsage()}
        cloudBlockReason={null}
        onNameChange={vi.fn()}
        onSaveKindChange={vi.fn()}
        onSaveTargetChange={onSaveTargetChange}
        onSaveLayout={onSaveLayout}
        onSaveTemplate={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Save layout as" });
    expect(within(dialog).getByRole("tab", { name: "Cloud" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Save to Cloud" }),
    );
    expect(onSaveLayout).toHaveBeenCalledOnce();

    await user.click(within(dialog).getByRole("tab", { name: "Local" }));
    expect(onSaveTargetChange).toHaveBeenCalledWith("local");
  });

  it("shows Local and Cloud library locations with Cloud row actions", async () => {
    const user = userEvent.setup();
    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[workspace("local-layout", "Local wall")]}
        cloudWorkspaces={[workspace("cloud-layout", "Cloud wall")]}
        localTemplates={[]}
        cloudTemplates={[]}
        storageTarget="cloud"
        onStorageTargetChange={vi.fn()}
        onOpenWorkspaces={vi.fn()}
        onOpenTemplates={vi.fn()}
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

    const dialog = screen.getByRole("dialog", { name: "Library" });
    expect(within(dialog).getByRole("tab", { name: "Cloud" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(within(dialog).getByText("Cloud wall")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Cloud").length).toBeGreaterThan(0);

    await user.click(
      within(dialog).getByRole("button", {
        name: "More actions for Cloud wall",
      }),
    );

    expect(
      within(dialog).getByRole("menuitem", { name: "Share" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("menuitem", { name: "Export JSON" }),
    ).toBeInTheDocument();
  });

  it("shows cloud metadata usage in the account dialog", () => {
    render(
      <AccountDialog
        open
        onOpenChange={vi.fn()}
        account={signedInAccount()}
        localCacheStatus={{ label: "Local cache: storage usage unavailable" }}
        cloudUsage={cloudUsage({ usedBytes: 2048 })}
        onRefreshLocalCacheStatus={vi.fn()}
        onClearLocalCache={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(within(dialog).getByText("Cloud metadata")).toBeInTheDocument();
    expect(within(dialog).getByText("2.0 KB / 5.0 MB")).toBeInTheDocument();
    expect(
      within(dialog).getByText("1 layout · 1 template"),
    ).toBeInTheDocument();
  });

  it("shows unlimited Cloud metadata usage for admins", () => {
    render(
      <AccountDialog
        open
        onOpenChange={vi.fn()}
        account={signedInAccount()}
        localCacheStatus={{ label: "Local cache: storage usage unavailable" }}
        cloudUsage={cloudUsage({ usedBytes: 2048, isUnlimited: true })}
        onRefreshLocalCacheStatus={vi.fn()}
        onClearLocalCache={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(within(dialog).getByText("2.0 KB / Unlimited")).toBeInTheDocument();
  });

  it("exposes copy, regenerate, and disable controls for Cloud share links", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    const onDisable = vi.fn();

    render(
      <ShareLinkDialog
        target={{
          kind: "layout",
          id: "cloud-layout",
          name: "Cloud wall",
          url: "https://scrollable.test/share/layout/abc12345",
          isEnabled: true,
        }}
        onOpenChange={vi.fn()}
        onRegenerate={onRegenerate}
        onDisable={onDisable}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Share link" });
    expect(within(dialog).getByText("Cloud wall")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Regenerate" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Disable" }));

    expect(onRegenerate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cloud-layout", kind: "layout" }),
    );
    expect(onDisable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cloud-layout", kind: "layout" }),
    );
  });
});

function signedInAccount(): AccountState {
  return { status: "signed-in", email: "reader@example.com" };
}

function cloudUsage(
  overrides: Partial<ReturnType<typeof baseCloudUsage>> = {},
) {
  return { ...baseCloudUsage(), ...overrides };
}

function baseCloudUsage() {
  return {
    status: "ready" as const,
    usedBytes: 1024,
    quotaBytes: 5 * 1024 * 1024,
    isUnlimited: false,
    layoutCount: 1,
    templateCount: 1,
  };
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
