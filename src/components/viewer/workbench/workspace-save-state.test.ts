import { describe, expect, it } from "vitest";

import type {
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  buildViewerSessionUpsertRows,
  buildViewerTemplateUpsertRows,
  openSaveDialogState,
  renameActiveWorkspaceTab,
  validateLayoutSaveName,
  validateTemplateSaveName,
} from "./workspace-save-state";

describe("workspace save state", () => {
  const tabs: WorkspaceTab[] = [
    { id: "workspace-1", name: "Layout 1" },
    { id: "workspace-2", name: "Second layout" },
  ];
  const savedWorkspaces: Record<string, SerializedWorkspace> = {
    "workspace-3": serializedWorkspace({
      id: "workspace-3",
      name: "Saved layout",
    }),
  };
  const savedTemplates: Record<string, SerializedWorkspaceTemplate> = {
    "template-1": serializedTemplate({
      id: "template-1",
      name: "Poster wall",
    }),
  };

  it("opens the save dialog with the active workspace name", () => {
    expect(
      openSaveDialogState("Longer than thirty-two characters layout"),
    ).toEqual({
      saveName: "Longer than thirty-two character",
      saveKind: "layout",
      saveError: null,
      isSaveOpen: true,
    });
  });

  it("validates layout save names and returns existing error text", () => {
    expect(
      validateLayoutSaveName({
        name: " ",
        activeWorkspaceId: "workspace-1",
        workspaceTabs: tabs,
        savedWorkspaces,
      }),
    ).toEqual({ ok: false, error: "Layout name is required" });

    expect(
      validateLayoutSaveName({
        name: "x".repeat(33),
        activeWorkspaceId: "workspace-1",
        workspaceTabs: tabs,
        savedWorkspaces,
      }),
    ).toEqual({
      ok: false,
      error: "Layout name must be 32 characters or fewer",
    });

    expect(
      validateLayoutSaveName({
        name: "saved layout",
        activeWorkspaceId: "workspace-1",
        workspaceTabs: tabs,
        savedWorkspaces,
      }),
    ).toEqual({ ok: false, error: "Layout names must be unique" });

    expect(
      validateLayoutSaveName({
        name: " Fresh layout ",
        activeWorkspaceId: "workspace-1",
        workspaceTabs: tabs,
        savedWorkspaces,
      }),
    ).toEqual({ ok: true, name: "Fresh layout" });
  });

  it("validates template save names and free-layout eligibility", () => {
    expect(
      validateTemplateSaveName({
        name: "Poster wall copy",
        activeWorkspaceId: "workspace-1",
        layoutMode: "fixed",
        savedTemplates,
      }),
    ).toEqual({
      ok: false,
      error: "Templates are only available for free layouts",
    });

    expect(
      validateTemplateSaveName({
        name: "",
        activeWorkspaceId: "workspace-1",
        layoutMode: "free",
        savedTemplates,
      }),
    ).toEqual({ ok: false, error: "Template name is required" });

    expect(
      validateTemplateSaveName({
        name: "Poster wall",
        activeWorkspaceId: "workspace-1",
        layoutMode: "free",
        savedTemplates,
      }),
    ).toEqual({ ok: false, error: "Template names must be unique" });

    expect(
      validateTemplateSaveName({
        name: " Empty boxes ",
        activeWorkspaceId: "workspace-1",
        layoutMode: "free",
        savedTemplates,
      }),
    ).toEqual({ ok: true, name: "Empty boxes" });
  });

  it("prepares renamed active workspace tabs without changing other tabs", () => {
    expect(
      renameActiveWorkspaceTab({
        workspaceTabs: tabs,
        activeWorkspaceId: "workspace-1",
        name: "Saved copy",
      }),
    ).toEqual([
      { id: "workspace-1", name: "Saved copy" },
      { id: "workspace-2", name: "Second layout" },
    ]);
  });

  it("builds metadata-only viewer_sessions upsert rows", () => {
    const workspace = serializedWorkspace({
      id: "workspace-1",
      name: "Saved layout",
    });

    const rows = buildViewerSessionUpsertRows({
      workspaces: [workspace],
      userId: "user-1",
      updatedAt: "2026-04-26T00:00:00.000Z",
    });

    expect(rows).toEqual([
      {
        id: "workspace-1",
        owner_id: "user-1",
        name: "Saved layout",
        layout_mode: "fixed",
        fixed_columns: 2,
        fixed_rows: 1,
        global_timer_seconds: 10,
        sessions: workspace.sessions,
        updated_at: "2026-04-26T00:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain("runtimeItems");
    expect(JSON.stringify(rows)).not.toContain("https://cdn.test/runtime.jpg");
  });

  it("builds metadata-only viewer_templates upsert rows", () => {
    const template = serializedTemplate({
      id: "template-1",
      name: "Poster wall",
    });

    expect(
      buildViewerTemplateUpsertRows({
        templates: [template],
        userId: "user-1",
        updatedAt: "2026-04-26T00:00:00.000Z",
      }),
    ).toEqual([
      {
        id: "template-1",
        owner_id: "user-1",
        name: "Poster wall",
        layers: template.layers,
        active_layer_id: "layer-1",
        global_timer_seconds: 10,
        slots: template.slots,
        updated_at: "2026-04-26T00:00:00.000Z",
      },
    ]);
  });
});

function serializedWorkspace({
  id,
  name,
}: {
  id: string;
  name: string;
}): SerializedWorkspace {
  return {
    id,
    name,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    layoutMode: "fixed",
    fixedGrid: { columns: 2, rows: 1 },
    globalTimerSeconds: 10,
    sessions: [
      {
        id: "session-1",
        title: "Runtime source",
        layerId: "layer-1",
        timerMode: "global",
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: {
          kind: "url",
          url: "https://example.com/gallery",
          resolverHint: "provider:gallery",
        },
      },
    ],
    updatedAt: "2026-04-26T00:00:00.000Z",
  };
}

function serializedTemplate({
  id,
  name,
}: {
  id: string;
  name: string;
}): SerializedWorkspaceTemplate {
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
    updatedAt: "2026-04-26T00:00:00.000Z",
  };
}
