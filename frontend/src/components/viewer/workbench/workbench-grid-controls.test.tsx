import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkbenchPanelContent } from "./workbench-panel";

const toastMocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: toastMocks.toast,
}));

describe("Workbench grid controls", () => {
  afterEach(() => {
    toastMocks.toast.error.mockClear();
  });

  it("caps mobile fixed grid controls at 3 and reports the mobile range", async () => {
    const user = userEvent.setup();
    const onFixedGridChange = vi.fn();
    render(
      <WorkbenchPanelContent
        {...panelProps({
          mode: "mobile",
          fixedGrid: { columns: 3, rows: 3 },
          onFixedGridChange,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Layout" }));
    const layoutSection = screen.getByRole("button", {
      name: "Layout",
    }).parentElement!;
    const columns = within(layoutSection).getByLabelText("Columns");

    expect(columns).toHaveAttribute("max", "3");

    await user.clear(columns);
    await user.type(columns, "4");
    await user.tab();

    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Grid range is 1-3 on mobile",
    );
    expect(onFixedGridChange).not.toHaveBeenCalled();
  });

  it("shows the mobile default grid as 1x2", async () => {
    const user = userEvent.setup();
    render(<WorkbenchPanelContent {...panelProps({ mode: "mobile" })} />);

    await user.click(screen.getByRole("button", { name: "Layout" }));
    const layoutSection = screen.getByRole("button", {
      name: "Layout",
    }).parentElement!;

    expect(within(layoutSection).getByLabelText("Columns")).toHaveValue("1");
    expect(within(layoutSection).getByLabelText("Rows")).toHaveValue("2");
  });

  it("shows three mobile sources as a single portrait column", async () => {
    const user = userEvent.setup();
    render(
      <WorkbenchPanelContent
        {...panelProps({
          mode: "mobile",
          fixedGrid: { columns: 3, rows: 1 },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Layout" }));
    const layoutSection = screen.getByRole("button", {
      name: "Layout",
    }).parentElement!;

    expect(within(layoutSection).getByLabelText("Columns")).toHaveValue("1");
    expect(within(layoutSection).getByLabelText("Rows")).toHaveValue("3");
  });

  it("keeps desktop fixed grid controls at 16 and reports the desktop range", async () => {
    const user = userEvent.setup();
    const onFixedGridChange = vi.fn();
    render(
      <WorkbenchPanelContent
        {...panelProps({
          mode: "desktop",
          fixedGrid: { columns: 16, rows: 16 },
          onFixedGridChange,
        })}
      />,
    );

    const columns = screen.getByLabelText("Columns");

    expect(columns).toHaveAttribute("max", "16");

    await user.clear(columns);
    await user.type(columns, "17");
    await user.tab();

    expect(toastMocks.toast.error).toHaveBeenCalledWith(
      "Grid range is 1-16 on desktop",
    );
    expect(onFixedGridChange).not.toHaveBeenCalled();
  });
});

function panelProps(
  overrides: Partial<React.ComponentProps<typeof WorkbenchPanelContent>> = {},
): React.ComponentProps<typeof WorkbenchPanelContent> {
  return {
    mode: "desktop",
    workspaceName: "Layout 1",
    layoutMode: "fixed",
    layoutModeLocked: false,
    fixedGrid: { columns: 2, rows: 1 },
    globalSeconds: 10,
    hasRunningSessionTimer: false,
    selected: null,
    canCloneOrFillSelectedSource: false,
    showAllInfo: false,
    isClearDisabled: true,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    layerStats: [
      { id: "layer-1", name: "Layer 1", sourceCount: 0, fileCount: 0 },
    ],
    activeLayerId: "layer-1",
    onLayoutModeChange: vi.fn(),
    onFixedGridChange: vi.fn(),
    onGlobalTimerSecondsChange: vi.fn(),
    onGlobalTimerAction: vi.fn(),
    onCloneSelectedSource: vi.fn(),
    onFillSelectedSourceSpace: vi.fn(),
    onRemoveSelectedSource: vi.fn(),
    onRandomizeSelectedSource: vi.fn(),
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
    onOpenSaveDialog: vi.fn(),
    onImportJson: vi.fn(),
    onExportCurrentJson: vi.fn(),
    onOpenClearDialog: vi.fn(),
    onSelectLayer: vi.fn(),
    ...overrides,
  };
}
