import { describe, expect, it } from "vitest";

import { createEmptyWorkspace } from "@/lib/viewer/workspaces";
import {
  prepareCreateWorkspaceTab,
  prepareOpenSavedTemplates,
  prepareOpenSavedWorkspaces,
} from "./workspace-actions";
import { toRuntimeWorkspace } from "./workspace-transform-helpers";
import type {
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";

const OPEN_TAB_LIMIT = 20;

describe("workspace actions", () => {
  it("does not create more than 20 open workspace tabs", () => {
    const tabs = workspaceTabs(OPEN_TAB_LIMIT);
    const current = runtimeWorkspace(tabs[0]);

    const result = prepareCreateWorkspaceTab({
      current,
      workspaceTabs: tabs,
      workspaceStates: { [current.id]: current },
      savedWorkspaces: {},
      createId: () => "blocked",
    });

    expect(result).toBeNull();
  });

  it("opens saved layouts only up to the 20 tab limit", () => {
    const tabs = workspaceTabs(OPEN_TAB_LIMIT - 1);
    const current = runtimeWorkspace(tabs[0]);
    const savedWorkspaces = Object.fromEntries(
      ["saved-1", "saved-2", "saved-3"].map((id) => [
        id,
        serializedWorkspace(id),
      ]),
    );

    const result = prepareOpenSavedWorkspaces({
      ids: ["saved-1", "saved-2", "saved-3"],
      current,
      workspaceTabs: tabs,
      workspaceStates: { [current.id]: current },
      savedWorkspaces,
    });

    expect(result?.nextTabs).toHaveLength(OPEN_TAB_LIMIT);
    expect(result?.nextTabs.at(-1)).toMatchObject({
      id: "saved-1",
      name: "Saved 1",
    });
    expect(result?.nextTabs.some((tab) => tab.id === "saved-2")).toBe(false);
    expect(result?.activeWorkspaceId).toBe("saved-1");
  });

  it("opens saved templates only up to the 20 tab limit", () => {
    const tabs = workspaceTabs(OPEN_TAB_LIMIT - 1);
    const current = runtimeWorkspace(tabs[0]);

    const result = prepareOpenSavedTemplates({
      ids: ["template-1", "template-2"],
      current,
      workspaceTabs: tabs,
      workspaceStates: { [current.id]: current },
      savedWorkspaces: {},
      savedTemplates: {
        "template-1": serializedTemplate("template-1", "Template 1"),
        "template-2": serializedTemplate("template-2", "Template 2"),
      },
      createId: nextId(["created-1", "created-2"]),
    });

    expect(result?.nextTabs).toHaveLength(OPEN_TAB_LIMIT);
    expect(result?.nextTabs.at(-1)).toMatchObject({
      id: "created-1",
      name: "Template 1",
    });
    expect(result?.nextTabs.some((tab) => tab.id === "created-2")).toBe(false);
    expect(result?.activeWorkspaceId).toBe("created-1");
  });
});

function workspaceTabs(count: number): WorkspaceTab[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `layout-${index + 1}`,
    name: `Layout ${index + 1}`,
  }));
}

function runtimeWorkspace(tab: WorkspaceTab): RuntimeWorkspace {
  return toRuntimeWorkspace(createEmptyWorkspace(tab.id, tab.name));
}

function serializedWorkspace(id: string): SerializedWorkspace {
  const name = `Saved ${id.split("-").at(-1) ?? id}`;
  return createEmptyWorkspace(id, name);
}

function serializedTemplate(
  id: string,
  name: string,
): SerializedWorkspaceTemplate {
  return {
    id,
    name,
    slots: [],
    layers: [],
    activeLayerId: "layer-1",
    globalTimerSeconds: 10,
    updatedAt: "2026-04-24T00:00:00.000Z",
  };
}

function nextId(ids: string[]) {
  let index = 0;
  return () => ids[index++] ?? `created-${index}`;
}
