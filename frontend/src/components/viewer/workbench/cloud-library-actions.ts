import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

import { toast } from "@/lib/toast";
import {
  cloudLibraryUsage,
  layoutWithLocalSourcesAsEmptyBoxes,
  workspaceHasLocalSources,
  type CloudShareTarget,
  type CloudUsageState,
  type SaveTarget,
} from "./cloud-save-state";
import { uniqueTemplateCopyName } from "./cloud-save-helpers";
import {
  downloadScrollableJson,
  localFilesOmittedDescription,
} from "./json-export-actions";
import type {
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import { uniqueWorkspaceName } from "./helpers";
import {
  writeWorkspaceStore,
  writeWorkspaceTemplateStore,
} from "./workspace-state";
import {
  disableViewerShareLinks,
  ensureViewerShareLink,
  regenerateViewerShareLink,
  upsertViewerSessionToAccount,
  upsertViewerTemplateToAccount,
} from "./workspace-sync-actions";

type CloudLibraryActionsInput = {
  activeWorkspaceId: string;
  workspaceTabs: WorkspaceTab[];
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  createId: () => string;
  setSavedWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setSavedTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setCloudWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setCloudTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setCloudUsage: Dispatch<SetStateAction<CloudUsageState>>;
  setLibraryStorageTarget: Dispatch<SetStateAction<SaveTarget>>;
  setCloudShareTarget: Dispatch<SetStateAction<CloudShareTarget | null>>;
};

export function useCloudLibraryActions({
  activeWorkspaceId,
  workspaceTabs,
  savedWorkspaces,
  savedTemplates,
  cloudWorkspaces,
  cloudTemplates,
  createId,
  setSavedWorkspaces,
  setSavedTemplates,
  setCloudWorkspaces,
  setCloudTemplates,
  setCloudUsage,
  setLibraryStorageTarget,
  setCloudShareTarget,
}: CloudLibraryActionsInput) {
  const updateCloudUsageFromLibrary = useCallback(
    (
      nextWorkspaces: Record<string, SerializedWorkspace>,
      nextTemplates: Record<string, SerializedWorkspaceTemplate>,
    ) => {
      setCloudUsage((current) =>
        cloudLibraryUsage({
          workspaces: Object.values(nextWorkspaces),
          templates: Object.values(nextTemplates),
          quotaBytes:
            current.status === "ready" ? current.quotaBytes : undefined,
          isUnlimited: current.status === "ready" ? current.isUnlimited : false,
        }),
      );
    },
    [setCloudUsage],
  );

  const uploadWorkspaceToCloud = useCallback(
    async (id: string) => {
      const workspace = savedWorkspaces[id];
      if (!workspace) return;
      const hasLocalSources = workspaceHasLocalSources(workspace);

      const copy = {
        ...layoutWithLocalSourcesAsEmptyBoxes(workspace),
        id: createId(),
        name: uniqueWorkspaceName(workspace.name, [], cloudWorkspaces),
        updatedAt: new Date().toISOString(),
      };
      const result = await upsertViewerSessionToAccount({ workspace: copy });
      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        toast.error("Sign in to upload to Cloud.");
        return;
      }

      const nextCloudWorkspaces = { ...cloudWorkspaces, [copy.id]: copy };
      setCloudWorkspaces(nextCloudWorkspaces);
      setLibraryStorageTarget("cloud");
      updateCloudUsageFromLibrary(nextCloudWorkspaces, cloudTemplates);
      if (hasLocalSources) {
        toast.warning("Uploaded layout without local files", {
          description: localFilesOmittedDescription(),
        });
      } else {
        toast.success("Uploaded layout to Cloud");
      }
    },
    [
      cloudTemplates,
      cloudWorkspaces,
      createId,
      savedWorkspaces,
      setCloudWorkspaces,
      setLibraryStorageTarget,
      updateCloudUsageFromLibrary,
    ],
  );

  const uploadTemplateToCloud = useCallback(
    async (id: string) => {
      const template = savedTemplates[id];
      if (!template) return;

      const copy = {
        ...template,
        id: createId(),
        name: uniqueTemplateCopyName(template.name, cloudTemplates),
        updatedAt: new Date().toISOString(),
      };
      const result = await upsertViewerTemplateToAccount({ template: copy });
      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        toast.error("Sign in to upload to Cloud.");
        return;
      }

      const nextCloudTemplates = { ...cloudTemplates, [copy.id]: copy };
      setCloudTemplates(nextCloudTemplates);
      setLibraryStorageTarget("cloud");
      updateCloudUsageFromLibrary(cloudWorkspaces, nextCloudTemplates);
      toast.success("Uploaded template to Cloud");
    },
    [
      cloudTemplates,
      cloudWorkspaces,
      createId,
      savedTemplates,
      setCloudTemplates,
      setLibraryStorageTarget,
      updateCloudUsageFromLibrary,
    ],
  );

  const exportSavedJson = useCallback(
    (kind: "layout" | "template", id: string, target: SaveTarget) => {
      const item =
        kind === "layout"
          ? target === "cloud"
            ? cloudWorkspaces[id]
            : savedWorkspaces[id]
          : target === "cloud"
            ? cloudTemplates[id]
            : savedTemplates[id];

      if (!item) return;
      const hasLocalSources =
        kind === "layout" &&
        workspaceHasLocalSources(item as SerializedWorkspace);
      const exportItem =
        kind === "layout"
          ? layoutWithLocalSourcesAsEmptyBoxes(item as SerializedWorkspace)
          : item;

      downloadScrollableJson({ kind, name: item.name, item: exportItem });
      if (hasLocalSources) {
        toast.warning("Exported JSON without local files", {
          description: localFilesOmittedDescription(),
        });
      } else {
        toast.success(`Exported ${kind} JSON`);
      }
    },
    [cloudTemplates, cloudWorkspaces, savedTemplates, savedWorkspaces],
  );

  function importSavedJson(target: SaveTarget) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const parsed = JSON.parse(await file.text()) as {
          type?: string;
          item?: SerializedWorkspace | SerializedWorkspaceTemplate;
        };
        if (parsed.type === "scrollable.layout.v1") {
          await importWorkspaceJson(parsed.item, target);
          return;
        }

        if (parsed.type === "scrollable.template.v1") {
          await importTemplateJson(parsed.item, target);
          return;
        }

        toast.error("Unsupported Scrollable JSON file.");
      } catch {
        toast.error("Could not import JSON.");
      }
    };
    input.click();
  }

  const shareCloudItem = useCallback(
    async (target: CloudShareTarget) => {
      const result = await ensureViewerShareLink({
        kind: target.kind,
        id: target.id,
      });

      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        toast.error("Sign in to create a Cloud share link.");
        return;
      }

      setCloudShareTarget({
        ...target,
        url: `${window.location.origin}/share/${target.kind}/${result.slug}`,
        isEnabled: true,
      });
    },
    [setCloudShareTarget],
  );

  const regenerateCloudShareLink = useCallback(
    async (target: CloudShareTarget) => {
      const result = await regenerateViewerShareLink({
        kind: target.kind,
        id: target.id,
      });

      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        toast.error("Sign in to regenerate a Cloud share link.");
        return;
      }

      setCloudShareTarget({
        ...target,
        url: `${window.location.origin}/share/${target.kind}/${result.slug}`,
        isEnabled: true,
      });
      toast.success("Share link regenerated");
    },
    [setCloudShareTarget],
  );

  const disableCloudShareLink = useCallback(
    async (target: CloudShareTarget) => {
      const result = await disableViewerShareLinks({
        kind: target.kind,
        id: target.id,
      });

      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        toast.error("Sign in to disable a Cloud share link.");
        return;
      }

      setCloudShareTarget(null);
      toast.success("Share link disabled");
    },
    [setCloudShareTarget],
  );

  async function importWorkspaceJson(
    item: SerializedWorkspace | SerializedWorkspaceTemplate | undefined,
    target: SaveTarget,
  ) {
    const workspace = item as SerializedWorkspace | undefined;
    if (!workspace) return;
    const hasLocalSources = workspaceHasLocalSources(workspace);
    const portableWorkspace = layoutWithLocalSourcesAsEmptyBoxes(workspace);

    const copy = {
      ...portableWorkspace,
      id: createId(),
      name:
        target === "cloud"
          ? uniqueWorkspaceName(portableWorkspace.name, [], cloudWorkspaces)
          : uniqueWorkspaceName(
              portableWorkspace.name,
              workspaceTabs,
              savedWorkspaces,
            ),
      updatedAt: new Date().toISOString(),
    };

    if (target === "cloud") {
      const result = await upsertViewerSessionToAccount({ workspace: copy });
      if (result.status !== "synced") {
        toast.error(
          result.status === "error"
            ? result.error
            : "Sign in to import to Cloud.",
        );
        return;
      }
      const nextCloudWorkspaces = { ...cloudWorkspaces, [copy.id]: copy };
      setCloudWorkspaces(nextCloudWorkspaces);
      updateCloudUsageFromLibrary(nextCloudWorkspaces, cloudTemplates);
    } else {
      const nextSaved = { ...savedWorkspaces, [copy.id]: copy };
      setSavedWorkspaces(nextSaved);
      writeWorkspaceStore(nextSaved, activeWorkspaceId);
    }
    if (hasLocalSources) {
      toast.warning("Imported layout without local files", {
        description: localFilesOmittedDescription(),
      });
    } else {
      toast.success(
        target === "cloud" ? "Imported layout to Cloud" : "Imported layout",
      );
    }
  }

  async function importTemplateJson(
    item: SerializedWorkspace | SerializedWorkspaceTemplate | undefined,
    target: SaveTarget,
  ) {
    const template = item as SerializedWorkspaceTemplate | undefined;
    if (!template) return;

    const copy = {
      ...template,
      id: createId(),
      name:
        target === "cloud"
          ? uniqueTemplateCopyName(template.name, cloudTemplates)
          : uniqueTemplateCopyName(template.name, savedTemplates),
      updatedAt: new Date().toISOString(),
    };

    if (target === "cloud") {
      const result = await upsertViewerTemplateToAccount({ template: copy });
      if (result.status !== "synced") {
        toast.error(
          result.status === "error"
            ? result.error
            : "Sign in to import to Cloud.",
        );
        return;
      }
      const nextCloudTemplates = { ...cloudTemplates, [copy.id]: copy };
      setCloudTemplates(nextCloudTemplates);
      updateCloudUsageFromLibrary(cloudWorkspaces, nextCloudTemplates);
    } else {
      const nextTemplates = { ...savedTemplates, [copy.id]: copy };
      setSavedTemplates(nextTemplates);
      writeWorkspaceTemplateStore(nextTemplates);
    }
    toast.success("Imported template");
  }

  return {
    uploadWorkspaceToCloud,
    uploadTemplateToCloud,
    exportSavedJson,
    importSavedJson,
    shareCloudItem,
    regenerateCloudShareLink,
    disableCloudShareLink,
  };
}
