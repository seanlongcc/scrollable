import type { Dispatch, SetStateAction } from "react";

import type { FixedGrid } from "@/lib/viewer/layout";
import type {
  AccountState,
  FeedSession,
  LayoutMode,
  RuntimeWorkspace,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceLayer,
  WorkspaceTab,
  WorkspaceTemplateSlot,
} from "./types";
import type { CloudUsageState, SaveTarget } from "./cloud-save-state";

type Setter<T> = Dispatch<SetStateAction<T>>;

export type WorkspaceHandlersInput = {
  workspaceName: string;
  saveName: string;
  activeWorkspaceId: string;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  saveTarget: SaveTarget;
  libraryStorageTarget: SaveTarget;
  account: AccountState;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  createId: () => string;
  hydrateRuntimeItems: (nextSessions: FeedSession[]) => void;
  getLocalCacheStatusMessage: () => Promise<string | null>;
  setSaveName: Setter<string>;
  setSaveKind: Setter<SaveKind>;
  setSaveError: Setter<string | null>;
  setIsSaveOpen: Setter<boolean>;
  setIsLayoutsOpen: Setter<boolean>;
  setWorkspaceTabs: Setter<WorkspaceTab[]>;
  setWorkspaceStates: Setter<Record<string, RuntimeWorkspace>>;
  setSavedWorkspaces: Setter<Record<string, SerializedWorkspace>>;
  setSavedTemplates: Setter<Record<string, SerializedWorkspaceTemplate>>;
  setCloudWorkspaces: Setter<Record<string, SerializedWorkspace>>;
  setCloudTemplates: Setter<Record<string, SerializedWorkspaceTemplate>>;
  setCloudUsage: Setter<CloudUsageState>;
  setActiveWorkspaceId: Setter<string>;
  setEditingWorkspaceId: Setter<string | null>;
  setEditingWorkspaceName: Setter<string>;
  setLayers: Setter<WorkspaceLayer[]>;
  setActiveLayerId: Setter<string>;
  setLayoutMode: Setter<LayoutMode>;
  setFixedGrid: Setter<FixedGrid>;
  setGlobalSeconds: Setter<number>;
  setTemplateSlots: Setter<WorkspaceTemplateSlot[]>;
  setSessions: Setter<FeedSession[]>;
  setGalleryIndexes: Setter<Record<string, number>>;
  setSelectedId: Setter<string | null>;
  setMaximizedId: Setter<string | null>;
  setPendingTemplateSlotId: Setter<string | null>;
};
