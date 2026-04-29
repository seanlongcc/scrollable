import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkbenchChrome } from "./workbench-chrome";

describe("WorkbenchChrome", () => {
  it("places JSON import to the left of JSON export in workbench actions", async () => {
    const user = userEvent.setup();
    const onImportJson = vi.fn();
    const onExportCurrentJson = vi.fn();

    render(
      <WorkbenchChrome
        {...chromeProps({ onImportJson, onExportCurrentJson })}
      />,
    );

    const actionsSection = screen.getByText("Actions").closest("section");
    expect(actionsSection).not.toBeNull();
    const actions = actionsSection as HTMLElement;
    const actionLabels = within(actions)
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim());

    expect(actionLabels.indexOf("Import JSON")).toBeLessThan(
      actionLabels.indexOf("Export JSON"),
    );

    await user.click(
      within(actions).getByRole("button", { name: "Import JSON" }),
    );
    await user.click(
      within(actions).getByRole("button", { name: "Export JSON" }),
    );

    expect(onImportJson).toHaveBeenCalledOnce();
    expect(onExportCurrentJson).toHaveBeenCalledOnce();
  });

  it("exposes current layout JSON export from the workbench actions", async () => {
    const user = userEvent.setup();
    const onExportCurrentJson = vi.fn();

    render(<WorkbenchChrome {...chromeProps({ onExportCurrentJson })} />);

    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(onExportCurrentJson).toHaveBeenCalledOnce();
  });
});

function chromeProps(
  overrides: Partial<React.ComponentProps<typeof WorkbenchChrome>> = {},
): React.ComponentProps<typeof WorkbenchChrome> {
  return {
    workspaceName: "Layout 1",
    layoutMode: "fixed",
    layoutModeLocked: false,
    fixedGrid: { columns: 2, rows: 2 },
    globalSeconds: 10,
    hasRunningSessionTimer: false,
    selected: null,
    canCloneOrFillSelectedSource: false,
    showAllInfo: false,
    isClearDisabled: true,
    isAnySheetOpen: false,
    isDesktopWorkbenchCollapsed: false,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    layerStats: [
      { id: "layer-1", name: "Layer 1", sourceCount: 0, fileCount: 0 },
    ],
    activeLayerId: "layer-1",
    accountButtonLabel: "Account",
    accountButtonTitle: "Account",
    onLayoutModeChange: vi.fn(),
    onFixedGridChange: vi.fn(),
    onGlobalTimerSecondsChange: vi.fn(),
    onGlobalTimerAction: vi.fn(),
    onCloneSelectedSource: vi.fn(),
    onFillSelectedSourceSpace: vi.fn(),
    onRemoveSelectedSource: vi.fn(),
    onSelectedTimerModeChange: vi.fn(),
    onSelectedTimerSecondsChange: vi.fn(),
    onSelectedMove: vi.fn(),
    onSelectedTogglePaused: vi.fn(),
    onSelectedRestart: vi.fn(),
    onEditSelectedSource: vi.fn(),
    onOpenSatellite: vi.fn(),
    onToggleShowAllInfo: vi.fn(),
    onHideUi: vi.fn(),
    onAddSource: vi.fn(),
    onOpenLibrary: vi.fn(),
    onOpenSaveDialog: vi.fn(),
    onImportJson: vi.fn(),
    onExportCurrentJson: vi.fn(),
    onOpenClearDialog: vi.fn(),
    onOpenAccount: vi.fn(),
    onDesktopWorkbenchCollapsedChange: vi.fn(),
    onSelectLayer: vi.fn(),
    onFreeRectChange: vi.fn(),
    ...overrides,
  };
}
