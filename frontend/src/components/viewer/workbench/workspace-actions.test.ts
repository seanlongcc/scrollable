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

  it("applies a saved template to the current active layer without opening a tab", () => {
    const tabs = workspaceTabs(1);
    const current = {
      ...runtimeWorkspace(tabs[0]),
      layoutMode: "free" as const,
      activeLayerId: "layer-2",
      templateSlots: [
        {
          id: "keep-layer-1",
          layerId: "layer-1",
          freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
        },
        {
          id: "replace-layer-2",
          layerId: "layer-2",
          freeRect: { column: 3, row: 1, columnSpan: 2, rowSpan: 2 },
        },
      ],
      sessions: [
        serializedSession("keep-session", "layer-1"),
        serializedSession("replace-session", "layer-2"),
      ],
    };

    const result = prepareOpenSavedTemplates({
      ids: ["template-1"],
      target: "current-tab",
      current,
      workspaceTabs: tabs,
      workspaceStates: { [current.id]: current },
      savedWorkspaces: {},
      savedTemplates: {
        "template-1": {
          ...serializedTemplate("template-1", "Template 1"),
          slots: [
            {
              id: "slot-1",
              layerId: "layer-1",
              freeRect: { column: 5, row: 1, columnSpan: 3, rowSpan: 3 },
            },
          ],
        },
      },
      createId: nextId(["created-1"]),
    });

    expect(result?.nextTabs).toEqual(tabs);
    expect(result?.activeWorkspaceId).toBe("layout-1");
    expect(result?.activeSnapshot.activeLayerId).toBe("layer-2");
    expect(result?.activeSnapshot.sessions).toEqual([
      serializedSession("keep-session", "layer-1"),
    ]);
    expect(result?.activeSnapshot.templateSlots).toEqual([
      {
        id: "keep-layer-1",
        layerId: "layer-1",
        freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
      },
      {
        id: "layout-1:layer-2:template-1:slot-1",
        layerId: "layer-2",
        freeRect: { column: 5, row: 1, columnSpan: 3, rowSpan: 3 },
      },
    ]);
  });

  it("applies a saved layout to the current active layer without opening a tab", () => {
    const tabs = workspaceTabs(1);
    const current = {
      ...runtimeWorkspace(tabs[0]),
      activeLayerId: "layer-2",
      sessions: [
        serializedSession("keep-session", "layer-1"),
        serializedSession("replace-session", "layer-2"),
      ],
    };

    const result = prepareOpenSavedWorkspaces({
      ids: ["saved-1"],
      target: "current-tab",
      current,
      workspaceTabs: tabs,
      workspaceStates: { [current.id]: current },
      savedWorkspaces: {
        "saved-1": {
          ...serializedWorkspace("saved-1"),
          layoutMode: "free",
          sessions: [serializedSession("saved-session", "layer-1")],
          templateSlots: [
            {
              id: "saved-slot",
              layerId: "layer-1",
              freeRect: { column: 6, row: 2, columnSpan: 3, rowSpan: 3 },
            },
          ],
        },
      },
    });

    expect(result?.nextTabs).toEqual(tabs);
    expect(result?.activeWorkspaceId).toBe("layout-1");
    expect(result?.activeSnapshot.layoutMode).toBe("free");
    expect(result?.activeSnapshot.activeLayerId).toBe("layer-2");
    expect(result?.activeSnapshot.sessions).toEqual([
      serializedSession("keep-session", "layer-1"),
      {
        ...serializedSession(
          "layout-1:layer-2:saved-1:saved-session",
          "layer-2",
        ),
        title: "Saved saved-session",
      },
    ]);
    expect(result?.activeSnapshot.templateSlots).toEqual([
      {
        id: "layout-1:layer-2:saved-1:saved-slot",
        layerId: "layer-2",
        freeRect: { column: 6, row: 2, columnSpan: 3, rowSpan: 3 },
      },
    ]);
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

function serializedSession(id: string, layerId: string) {
  return {
    id,
    title: `Saved ${id}`,
    layerId,
    timerMode: "global" as const,
    timerSeconds: 10,
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    sourceConfig: {
      kind: "local" as const,
      fileCount: 1,
    },
  };
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
