import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import { toast } from "@/lib/toast";
import type { FixedGrid } from "@/lib/viewer/layout";
import { uniqueTemplateCopyName } from "./cloud-save-helpers";
import { uniqueWorkspaceName, workspaceFromTemplate } from "./helpers";
import type {
  FeedSession,
  LayoutMode,
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceLayer,
  WorkspaceTab,
  WorkspaceTemplateSlot,
} from "./types";
import {
  createCurrentWorkspaceState,
  writeWorkspaceSessionStore,
  writeWorkspaceStore,
  writeWorkspaceTemplateStore,
} from "./workspace-state";

type SharedViewerUrlActionsInput = {
  activeWorkspaceId: string;
  workspaceName: string;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  createId: () => string;
  applyWorkspaceSnapshot: (workspace: RuntimeWorkspace) => void;
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  setWorkspaceStates: Dispatch<
    SetStateAction<Record<string, RuntimeWorkspace>>
  >;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  setSavedWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setSavedTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
};

export function useSharedViewerUrlActions({
  activeWorkspaceId,
  workspaceName,
  layers,
  activeLayerId,
  layoutMode,
  fixedGrid,
  globalSeconds,
  sessions,
  templateSlots,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  savedTemplates,
  createId,
  applyWorkspaceSnapshot,
  setWorkspaceTabs,
  setWorkspaceStates,
  setActiveWorkspaceId,
  setSavedWorkspaces,
  setSavedTemplates,
}: SharedViewerUrlActionsInput) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const openLayoutSlug = params.get("openLayout");
    const importLayoutSlug = params.get("importLayout");
    const openTemplateSlug = params.get("openTemplate");
    const importTemplateSlug = params.get("importTemplate");

    if (openLayoutSlug || importLayoutSlug) {
      void openSharedLayout(
        openLayoutSlug ?? importLayoutSlug!,
        Boolean(importLayoutSlug),
      );
      return;
    }

    if (openTemplateSlug || importTemplateSlug) {
      void openSharedTemplate(
        openTemplateSlug ?? importTemplateSlug!,
        Boolean(importTemplateSlug),
      );
    }

    async function openSharedLayout(slug: string, shouldImport: boolean) {
      const response = await fetch(`/api/share/layout/${slug}`);
      if (!response.ok) {
        toast.error("Shared layout is unavailable.");
        return;
      }

      const payload = (await response.json()) as {
        workspace?: SerializedWorkspace;
      };
      if (!payload.workspace) return;

      const copy = {
        ...payload.workspace,
        id: createId(),
        name: uniqueWorkspaceName(
          payload.workspace.name,
          workspaceTabs,
          savedWorkspaces,
        ),
        updatedAt: new Date().toISOString(),
      };
      const workspace: RuntimeWorkspace = {
        ...copy,
        templateSlots: copy.templateSlots ?? [],
      };
      const current = createCurrentWorkspaceState({
        activeWorkspaceId,
        name: workspaceName,
        layers,
        activeLayerId,
        layoutMode,
        fixedGrid,
        globalSeconds,
        sessions,
        templateSlots,
      });
      const nextTabs = [...workspaceTabs, { id: copy.id, name: copy.name }];
      const nextStates = {
        ...workspaceStates,
        [activeWorkspaceId]: current,
        [copy.id]: workspace,
      };

      setWorkspaceTabs(nextTabs);
      setWorkspaceStates(nextStates);
      setActiveWorkspaceId(copy.id);
      if (shouldImport) {
        const nextSaved = { ...savedWorkspaces, [copy.id]: copy };
        setSavedWorkspaces(nextSaved);
        writeWorkspaceStore(nextSaved, copy.id);
      }
      writeWorkspaceSessionStore(nextTabs, copy.id, {
        ...savedWorkspaces,
        ...(shouldImport ? { [copy.id]: copy } : {}),
      });
      applyWorkspaceSnapshot(workspace);
      toast.success(
        shouldImport ? "Imported shared layout" : "Opened shared layout",
      );
    }

    async function openSharedTemplate(slug: string, shouldImport: boolean) {
      const response = await fetch(`/api/share/template/${slug}`);
      if (!response.ok) {
        toast.error("Shared template is unavailable.");
        return;
      }

      const payload = (await response.json()) as {
        template?: SerializedWorkspaceTemplate;
      };
      if (!payload.template) return;

      const template = {
        ...payload.template,
        id: createId(),
        name: uniqueTemplateCopyName(payload.template.name, savedTemplates),
        updatedAt: new Date().toISOString(),
      };
      const nextId = createId();
      const workspace = workspaceFromTemplate(template, nextId, template.name);
      const current = createCurrentWorkspaceState({
        activeWorkspaceId,
        name: workspaceName,
        layers,
        activeLayerId,
        layoutMode,
        fixedGrid,
        globalSeconds,
        sessions,
        templateSlots,
      });
      const nextTabs = [...workspaceTabs, { id: nextId, name: workspace.name }];

      setWorkspaceTabs(nextTabs);
      setWorkspaceStates({
        ...workspaceStates,
        [activeWorkspaceId]: current,
        [nextId]: workspace,
      });
      setActiveWorkspaceId(nextId);
      if (shouldImport) {
        const nextTemplates = { ...savedTemplates, [template.id]: template };
        setSavedTemplates(nextTemplates);
        writeWorkspaceTemplateStore(nextTemplates);
      }
      writeWorkspaceSessionStore(nextTabs, nextId, savedWorkspaces);
      applyWorkspaceSnapshot(workspace);
      toast.success(
        shouldImport ? "Imported shared template" : "Opened shared template",
      );
    }
    // Shared URL import should run once with initial workbench state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
