import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkbenchChrome } from "./workbench-chrome";
import type {
  WorkbenchPanelContentProps,
  WorkbenchPanelSheetProps,
} from "./workbench-panel";

describe("WorkbenchChrome", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = createMatchMedia(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
  });

  it("closes the mobile workbench sheet before opening add source", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();

    const { container } = render(
      <WorkbenchChrome {...chromeProps({ onAddSource })} />,
    );
    const nav = mobileBottomNav(container);

    await user.click(buttonIn(nav, "Workbench"));
    const workbench = await workbenchSheet();

    await user.click(buttonIn(workbench, "Add source"));

    expect(onAddSource).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();
  });

  it("starts the mobile workbench with actions visible and advanced controls collapsed", async () => {
    const user = userEvent.setup();

    const { container } = render(<WorkbenchChrome {...chromeProps()} />);
    const nav = mobileBottomNav(container);

    await user.click(buttonIn(nav, "Workbench"));
    const workbench = await workbenchSheet();

    expect(buttonIn(workbench, "Add source")).toBeInTheDocument();
    expect(buttonIn(workbench, "Import JSON")).toBeInTheDocument();
    expect(buttonIn(workbench, "Export JSON")).toBeInTheDocument();
    expect(buttonIn(workbench, "Import JSON")?.textContent?.trim()).toBe(
      "Import JSON",
    );
    expect(buttonIn(workbench, "Export JSON")?.textContent?.trim()).toBe(
      "Export JSON",
    );
    expect(
      buttonIn(workbench, "Select Layer 1", { optional: true }),
    ).not.toBeInTheDocument();
    expect(
      within(workbench).queryByLabelText("Global timer seconds"),
    ).not.toBeInTheDocument();

    await user.click(buttonIn(workbench, "Layout"));

    expect(buttonIn(workbench, "Select Layer 1")).toBeInTheDocument();
  });

  it("closes the mobile workbench sheet before opening save and clear overlays", async () => {
    const user = userEvent.setup();
    const onOpenSaveDialog = vi.fn();
    const onOpenClearDialog = vi.fn();

    const { container, rerender } = render(
      <WorkbenchChrome {...chromeProps({ onOpenSaveDialog })} />,
    );
    const nav = mobileBottomNav(container);

    await user.click(buttonIn(nav, "Workbench"));
    await user.click(buttonIn(await workbenchSheet(), "Save layout"));

    expect(onOpenSaveDialog).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();

    rerender(
      <WorkbenchChrome
        {...chromeProps({ isClearDisabled: false, onOpenClearDialog })}
      />,
    );

    await user.click(buttonIn(nav, "Workbench"));
    await user.click(buttonIn(await workbenchSheet(), "Clear layout"));

    expect(onOpenClearDialog).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();
  });

  it("closes the mobile workbench sheet before opening library, workspace, and account overlays", async () => {
    const user = userEvent.setup();
    const onOpenLibrary = vi.fn();
    const onOpenWorkspace = vi.fn();
    const onOpenAccount = vi.fn();

    const { container, rerender } = render(
      <WorkbenchChrome {...chromeProps({ onOpenLibrary })} />,
    );
    const nav = mobileBottomNav(container);

    await user.click(buttonIn(nav, "Workbench"));
    fireEvent.click(buttonIn(nav, "Library"));

    expect(onOpenLibrary).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();

    rerender(<WorkbenchChrome {...chromeProps({ onOpenWorkspace })} />);

    await user.click(buttonIn(nav, "Workbench"));
    fireEvent.click(buttonIn(nav, "Workspace"));

    expect(onOpenWorkspace).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();

    rerender(<WorkbenchChrome {...chromeProps({ onOpenAccount })} />);

    await user.click(buttonIn(nav, "Workbench"));
    fireEvent.click(buttonIn(nav, "Account"));

    expect(onOpenAccount).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="sheet-content"]'),
    ).not.toBeInTheDocument();
  });

  it("uses stateful source-info labels", async () => {
    const user = userEvent.setup();
    const onToggleShowAllInfo = vi.fn();
    const { rerender } = render(
      <WorkbenchChrome {...chromeProps({ onToggleShowAllInfo })} />,
    );

    await user.click(await screen.findByRole("button", { name: "Show info" }));
    expect(onToggleShowAllInfo).toHaveBeenCalledOnce();

    rerender(<WorkbenchChrome {...chromeProps({ showAllInfo: true })} />);
    expect(screen.getByRole("button", { name: "Hide info" })).toHaveAttribute(
      "data-variant",
      "default",
    );
  });

  it("keeps mobile bottom navigation icon-only", () => {
    const { container } = render(<WorkbenchChrome {...chromeProps()} />);

    const nav = mobileBottomNav(container);

    expect(buttonIn(nav, "Workbench")).toBeInTheDocument();
    expect(buttonIn(nav, "Library")).toBeInTheDocument();
    expect(buttonIn(nav, "Workspace")).toBeInTheDocument();
    expect(buttonIn(nav, "Account")).toBeInTheDocument();
    expect(buttonIn(nav, "Workbench")).toHaveClass(
      "[&_svg:not([class*='size-'])]:size-5",
    );
    expect(buttonIn(nav, "Library")).toHaveClass(
      "[&_svg:not([class*='size-'])]:size-5",
    );
    expect(buttonIn(nav, "Workspace")).toHaveClass(
      "[&_svg:not([class*='size-'])]:size-5",
    );
    expect(buttonIn(nav, "Account")).toHaveClass(
      "[&_svg:not([class*='size-'])]:size-5",
    );
    expect(
      within(nav as HTMLElement).queryByText("Workbench"),
    ).not.toBeInTheDocument();
    expect(
      within(nav as HTMLElement).queryByText("Library"),
    ).not.toBeInTheDocument();
    expect(
      within(nav as HTMLElement).queryByText("Workspace"),
    ).not.toBeInTheDocument();
    expect(
      within(nav as HTMLElement).queryByText("Account"),
    ).not.toBeInTheDocument();
  });

  it("keeps account action accessible while hiding its mobile text", () => {
    const { container } = render(
      <WorkbenchChrome
        {...chromeProps({
          accountButtonLabel: "Sign in",
          accountButtonTitle: "Sign in",
        })}
      />,
    );

    const nav = mobileBottomNav(container);

    expect(buttonIn(nav, "Sign in")).toBeInTheDocument();
    expect(within(nav).queryByText("Sign in")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Account")).not.toBeInTheDocument();
  });

  it("keeps the full workbench panel unmounted on mobile until opened", async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia(false);

    try {
      const { container } = render(<WorkbenchChrome {...chromeProps()} />);
      const nav = mobileBottomNav(container);

      expect(screen.queryByText("Actions")).not.toBeInTheDocument();

      await user.click(buttonIn(nav, "Workbench"));

      expect(await screen.findByText("Actions")).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("hydrates desktop viewport without replacing the server panel placeholder", async () => {
    const originalMatchMedia = window.matchMedia;
    const props = chromeProps({
      workbenchPanelComponents: {
        Content: TestPanelContent,
        Sheet: TestPanelSheet,
      },
    });
    const onRecoverableError = vi.fn();
    const container = document.createElement("div");
    let unmountRoot = () => {};

    try {
      window.matchMedia = createMatchMedia(false);
      container.innerHTML = renderToString(<WorkbenchChrome {...props} />);
      document.body.append(container);
      expect(
        container.querySelector("#desktop-workbench-panel"),
      ).toHaveAttribute("hidden");

      window.matchMedia = createMatchMedia(true);
      await act(async () => {
        const root = hydrateRoot(container, <WorkbenchChrome {...props} />, {
          onRecoverableError,
        });
        unmountRoot = () => root.unmount();
      });

      await waitFor(() =>
        expect(
          container.querySelector("#desktop-workbench-panel"),
        ).not.toHaveAttribute("hidden"),
      );
      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      unmountRoot();
      container.remove();
      window.matchMedia = originalMatchMedia;
    }
  });

  it("shows legal and release links at the bottom of the desktop workbench panel", async () => {
    stubLatestRelease();

    render(<WorkbenchChrome {...chromeProps()} />);

    const panel = screen.getByLabelText("Workbench contextual panel");

    expect(
      await within(panel).findByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(within(panel).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(panel).getByRole("link", { name: "Changelog" }),
    ).toHaveAttribute("href", "/changelog");
    expect(
      await within(panel).findByRole("link", { name: "v0.2.0" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/seanlongcc/scrollable/releases/tag/v0.2.0",
    );
  });

  it("places JSON import to the left of JSON export in workbench actions", async () => {
    const user = userEvent.setup();
    const onImportJson = vi.fn();
    const onExportCurrentJson = vi.fn();

    render(
      <WorkbenchChrome
        {...chromeProps({ onImportJson, onExportCurrentJson })}
      />,
    );

    const actionsSection = (await screen.findByText("Actions")).closest(
      "section",
    );
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

    await user.click(
      await screen.findByRole("button", { name: "Export JSON" }),
    );

    expect(onExportCurrentJson).toHaveBeenCalledOnce();
  });

  it("preloads overlays from Add, Library, Workspace, Account, and Save intent", async () => {
    const onPreloadOverlays = vi.fn();

    render(<WorkbenchChrome {...chromeProps({ onPreloadOverlays })} />);

    fireEvent.mouseEnter(
      await screen.findByRole("button", { name: "Library" }),
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Workspace" }));
    fireEvent.focus(screen.getByRole("button", { name: "Account" }));

    const addSource = await screen.findByRole("button", {
      name: "Add source",
    });
    const saveLayout = await screen.findByRole("button", {
      name: "Save layout",
    });

    fireEvent.mouseEnter(addSource);
    fireEvent.pointerDown(addSource);
    fireEvent.focus(saveLayout);

    expect(onPreloadOverlays).toHaveBeenCalledTimes(6);
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
    onOpenWorkspace: vi.fn(),
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

function mobileBottomNav(container: HTMLElement) {
  const nav = container.querySelector<HTMLElement>(
    'nav[aria-label="Mobile bottom navigation"]',
  );
  expect(nav).not.toBeNull();

  return nav as HTMLElement;
}

function buttonIn(container: HTMLElement, name: string): HTMLButtonElement;
function buttonIn(
  container: HTMLElement,
  name: string,
  options: { optional: true },
): HTMLButtonElement | null;
function buttonIn(
  container: HTMLElement,
  name: string,
  { optional = false }: { optional?: boolean } = {},
) {
  const button = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"], button[title="${name}"]`,
  );
  if (!optional) expect(button).not.toBeNull();

  return button as HTMLButtonElement | null;
}

async function workbenchSheet() {
  return waitFor(() => {
    const sheet = document.querySelector<HTMLElement>(
      '[data-slot="sheet-content"]',
    );
    if (!sheet) throw new Error("Expected workbench sheet");

    return sheet;
  });
}

function createMatchMedia(matches: boolean) {
  return vi.fn<Window["matchMedia"]>((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

function TestPanelContent({ mode }: WorkbenchPanelContentProps) {
  return <section>{mode} workbench panel</section>;
}

function TestPanelSheet({ open }: WorkbenchPanelSheetProps) {
  return open ? <div data-slot="sheet-content">Workbench</div> : null;
}
