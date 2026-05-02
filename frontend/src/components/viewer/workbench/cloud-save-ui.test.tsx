import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AccountDialog,
  LayoutDialog,
  SaveLayoutDialog,
  ShareLinkDialog,
} from "./dialogs";
import type {
  AccountState,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
} from "./types";

const toastMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: toastMocks.toast,
}));

describe("cloud save UI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
      screen.getByRole("menu", { name: "More actions for Cloud wall" }),
    ).toHaveAttribute("data-side", "right");
    expect(screen.getByRole("menuitem", { name: "Share" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Export JSON" }),
    ).toBeInTheDocument();
  });

  it("closes the Cloud row actions menu after opening the share link dialog", async () => {
    const user = userEvent.setup();
    const onShareCloudItem = vi.fn();

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[]}
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
        onShareCloudItem={onShareCloudItem}
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
    await user.click(
      within(dialog).getByRole("button", {
        name: "More actions for Cloud wall",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Share" }));

    expect(onShareCloudItem).toHaveBeenCalledWith("layout", "cloud-layout");
    expect(screen.queryByRole("menuitem", { name: "Share" })).toBeNull();
  });

  it("shows close controls for open layouts in the workspace sheet", async () => {
    const user = userEvent.setup();
    const onCloseWorkspaceTab = vi.fn();

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        view="workspace"
        localWorkspaces={[]}
        cloudWorkspaces={[]}
        localTemplates={[]}
        cloudTemplates={[]}
        storageTarget="local"
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
        onCloseWorkspaceTab={onCloseWorkspaceTab}
        onSaveCurrentLayout={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Workspace" });
    const closeButton = within(dialog).getByRole("button", {
      name: "Close Active",
    });

    expect(closeButton).not.toHaveClass("hidden");

    await user.click(closeButton);

    expect(onCloseWorkspaceTab).toHaveBeenCalledWith("active");
  });

  it("disables New blank in the workspace sheet at 20 open tabs", () => {
    const workspaceTabs = Array.from({ length: 20 }, (_, index) => ({
      id: `layout-${index + 1}`,
      name: `Layout ${index + 1}`,
    }));

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        view="workspace"
        localWorkspaces={[]}
        cloudWorkspaces={[]}
        localTemplates={[]}
        cloudTemplates={[]}
        storageTarget="local"
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
        workspaceTabs={workspaceTabs}
        openWorkspaceStats={{}}
        activeWorkspaceId="layout-1"
        onSelectWorkspace={vi.fn()}
        onCreateWorkspaceTab={vi.fn()}
        onCloseWorkspaceTab={vi.fn()}
        onSaveCurrentLayout={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Workspace" });

    expect(
      within(dialog).getByRole("button", { name: "New blank" }),
    ).toBeDisabled();
  });

  it("selects all visible layouts and imports JSON from the bulk action", async () => {
    const user = userEvent.setup();
    const onImportJson = vi.fn();

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[
          workspace("local-layout", "Local wall"),
          workspace("movie-layout", "Movie wall"),
        ]}
        cloudWorkspaces={[]}
        localTemplates={[]}
        cloudTemplates={[]}
        storageTarget="local"
        onStorageTargetChange={vi.fn()}
        onOpenWorkspaces={vi.fn()}
        onOpenTemplates={vi.fn()}
        onDeleteWorkspace={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onUploadWorkspaceToCloud={vi.fn()}
        onUploadTemplateToCloud={vi.fn()}
        onShareCloudItem={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={onImportJson}
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
    await user.click(
      within(dialog).getByRole("button", { name: "Select all layouts" }),
    );

    expect(
      within(dialog).getByRole("checkbox", { name: "Select Local wall" }),
    ).toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select Movie wall" }),
    ).toBeChecked();

    await user.click(
      within(dialog).getByRole("button", { name: "Deselect all layouts" }),
    );

    expect(
      within(dialog).getByRole("checkbox", { name: "Select Local wall" }),
    ).not.toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select Movie wall" }),
    ).not.toBeChecked();

    await user.click(
      within(dialog).getByRole("button", { name: "Select all layouts" }),
    );

    expect(
      within(dialog).queryByRole("button", { name: "Delete selected layouts" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Import JSON" }),
    );

    expect(onImportJson).toHaveBeenCalledWith("local");
  });

  it("deselects all visible templates from the Templates bulk action", async () => {
    const user = userEvent.setup();

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[]}
        cloudWorkspaces={[]}
        localTemplates={[
          template("template-1", "mango"),
          template("template-2", "evanshi3"),
        ]}
        cloudTemplates={[]}
        storageTarget="local"
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
    await user.click(within(dialog).getByRole("tab", { name: "Templates" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Select all templates" }),
    );

    expect(
      within(dialog).getByRole("checkbox", { name: "Select mango" }),
    ).toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select evanshi3" }),
    ).toBeChecked();

    await user.click(
      within(dialog).getByRole("button", { name: "Deselect all templates" }),
    );

    expect(
      within(dialog).getByRole("checkbox", { name: "Select mango" }),
    ).not.toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select evanshi3" }),
    ).not.toBeChecked();
  });

  it("keeps double-digit layout counts compact on one metadata line", () => {
    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[workspaceWithCounts("many-layout", "Many wall")]}
        cloudWorkspaces={[]}
        localTemplates={[]}
        cloudTemplates={[]}
        storageTarget="local"
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
        openWorkspaceStats={{ active: { sourceCount: 12, fileCount: 14 } }}
        activeWorkspaceId="active"
        onSelectWorkspace={vi.fn()}
        onCreateWorkspaceTab={vi.fn()}
        onCloseWorkspaceTab={vi.fn()}
        onSaveCurrentLayout={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Library" });
    const metadata = within(dialog).getByText("fixed · 12 src · 14 files");

    expect(metadata).toHaveAttribute("title", "fixed · 12 sources · 14 files");
    expect(metadata).toHaveClass("whitespace-nowrap");
    expect(metadata).toHaveClass("overflow-hidden");
  });

  it("keeps template metadata short and toggles selection from the row body", async () => {
    const user = userEvent.setup();

    render(
      <LayoutDialog
        open
        onOpenChange={vi.fn()}
        localWorkspaces={[]}
        cloudWorkspaces={[]}
        localTemplates={[template("template-1", "mango")]}
        cloudTemplates={[]}
        storageTarget="local"
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
    await user.click(within(dialog).getByRole("tab", { name: "Templates" }));

    expect(within(dialog).queryByText(/tmpl/)).not.toBeInTheDocument();
    expect(within(dialog).getByText("free · 3 box")).toHaveAttribute(
      "title",
      "free template · 3 boxes",
    );

    const checkbox = within(dialog).getByRole("checkbox", {
      name: "Select mango",
    });
    expect(checkbox).not.toBeChecked();

    await user.click(within(dialog).getByText("mango"));
    expect(checkbox).toBeChecked();
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
      within(dialog).getByRole("meter", { name: "Cloud metadata usage" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      within(dialog).getByText("1 layout · 1 template"),
    ).toBeInTheDocument();
  });

  it("shows local cache usage with the same meter layout as Cloud", () => {
    render(
      <AccountDialog
        open
        onOpenChange={vi.fn()}
        account={signedInAccount()}
        localCacheStatus={{
          label: "Local cache: 2.0 GB / 10 GB used",
          freeLabel: "8.0 GB free",
          usageBytes: 2 * 1024 ** 3,
          quotaBytes: 10 * 1024 ** 3,
        }}
        cloudUsage={cloudUsage({ usedBytes: 2048 })}
        onRefreshLocalCacheStatus={vi.fn()}
        onClearLocalCache={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(within(dialog).getByText("Local media cache")).toBeInTheDocument();
    expect(within(dialog).getByText("2.0 GB / 10 GB used")).toBeInTheDocument();
    expect(within(dialog).getByText("8.0 GB free")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("meter", { name: "Local media cache usage" }),
    ).toHaveAttribute("aria-valuenow", "20");
  });

  it("hides legal and release links in the desktop account dialog", () => {
    stubLatestRelease();

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

    expect(
      within(dialog).queryByRole("link", { name: "Privacy" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Terms" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Changelog" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "v0.2.0" }),
    ).not.toBeInTheDocument();
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
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

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

    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(
      "https://scrollable.test/share/layout/abc12345",
    );
    await waitFor(() =>
      expect(toastMocks.toast.success).toHaveBeenCalledWith("Link copied"),
    );

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

function stubLatestRelease() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (input !== "/api/releases/latest") {
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }

      return Response.json({
        release: {
          tagName: "v0.2.0",
          htmlUrl:
            "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
        },
      });
    }),
  );
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

function workspaceWithCounts(id: string, name: string): SerializedWorkspace {
  return {
    ...workspace(id, name),
    sessions: Array.from({ length: 12 }, (_, index) => ({
      id: `session-${index}`,
      title: `Local ${index}`,
      layerId: "layer-1",
      timerMode: "global",
      timerSeconds: 10,
      fixedSlot: index,
      freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
      sourceConfig: {
        kind: "local",
        fileCount: index < 2 ? 2 : 1,
      },
    })),
  };
}

function template(id: string, name: string): SerializedWorkspaceTemplate {
  return {
    id,
    name,
    layers: Array.from({ length: 3 }, (_, index) => ({
      id: `layer-${index}`,
      name: `Layer ${index + 1}`,
    })),
    activeLayerId: "layer-0",
    globalTimerSeconds: 10,
    slots: Array.from({ length: 3 }, (_, index) => ({
      id: `slot-${index}`,
      layerId: `layer-${index}`,
      freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    })),
    updatedAt: "2026-04-28T00:00:00.000Z",
  };
}
