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
});

function props() {
  const tabs: WorkspaceTab[] = [
    {
      id: 'layout."one"',
      name: "Untitled layout",
    },
  ];

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
