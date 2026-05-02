import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceTabs } from "./workspace-tabs";
import type { WorkspaceTab } from "./types";

describe("WorkspaceTabs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders when CSS.escape is unavailable", () => {
    vi.stubGlobal("CSS", {});

    render(<WorkspaceTabs {...props()} />);

    expect(
      screen.getByRole("button", { name: "Untitled layout" }),
    ).toBeInTheDocument();
  });

  it("renders when ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined);

    render(<WorkspaceTabs {...props()} />);

    expect(
      screen.getByRole("button", { name: "Untitled layout" }),
    ).toBeInTheDocument();
  });

  it("disables creating another layout at 20 open tabs", () => {
    render(<WorkspaceTabs {...props({ tabCount: 20 })} />);

    expect(screen.getByRole("button", { name: "New layout" })).toBeDisabled();
  });
});

function props({ tabCount = 1 } = {}) {
  const tabs: WorkspaceTab[] = Array.from({ length: tabCount }, (_, index) => ({
    id: index === 0 ? 'layout."one"' : `layout-${index + 1}`,
    name: index === 0 ? "Untitled layout" : `Layout ${index + 1}`,
  }));

  return {
    tabs,
    activeWorkspaceId: tabs[0].id,
    editingWorkspaceId: null,
    editingWorkspaceName: "",
    maxNameLength: 80,
    onSelectWorkspace: vi.fn(),
    onBeginWorkspaceRename: vi.fn(),
    onEditingWorkspaceNameChange: vi.fn(),
    onCommitWorkspaceRename: vi.fn(),
    onCancelWorkspaceRename: vi.fn(),
    onCloseWorkspaceTab: vi.fn(),
    onCreateWorkspaceTab: vi.fn(),
  };
}
