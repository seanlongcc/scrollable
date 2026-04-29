import type {
  AccountState,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
} from "./types";
import { normalizeWorkspaceTemplateSlots } from "@/lib/viewer/workspaces";

export type SaveTarget = "local" | "cloud";
export type CloudItemKind = "layout" | "template";

export const CLOUD_METADATA_QUOTA_BYTES = 5 * 1024 * 1024;
export const SAVE_TARGET_STORAGE_KEY = "scrollable.save-target.v1";

export type CloudUsageState =
  | { status: "unconfigured" | "signed-out" | "loading" }
  | {
      status: "ready";
      usedBytes: number;
      quotaBytes: number;
      isUnlimited: boolean;
      layoutCount: number;
      templateCount: number;
    };

export type CloudShareTarget = {
  kind: CloudItemKind;
  id: string;
  name: string;
  url?: string;
  isEnabled?: boolean;
};

export function workspaceHasLocalSources(workspace: SerializedWorkspace) {
  return workspace.sessions.some(
    (session) => session.sourceConfig.kind === "local",
  );
}

export function layoutWithLocalSourcesAsEmptyBoxes(
  workspace: SerializedWorkspace,
): SerializedWorkspace {
  const localSessions = workspace.sessions.filter(
    (session) => session.sourceConfig.kind === "local",
  );

  if (localSessions.length === 0) return workspace;

  const sessions = workspace.sessions.filter(
    (session) => session.sourceConfig.kind !== "local",
  );
  const existingTemplateSlots = normalizeWorkspaceTemplateSlots(
    workspace.templateSlots,
    workspace.activeLayerId,
  );

  if (workspace.layoutMode !== "free") {
    return {
      ...workspace,
      sessions,
      ...(existingTemplateSlots.length
        ? { templateSlots: existingTemplateSlots }
        : {}),
    };
  }

  const usedSlotIds = new Set(existingTemplateSlots.map((slot) => slot.id));
  const replacementSlots = localSessions
    .map((session) => ({
      id: session.templateSlotId ?? session.id,
      layerId: session.layerId ?? workspace.activeLayerId,
      freeRect: session.freeRect,
    }))
    .filter((slot) => {
      if (usedSlotIds.has(slot.id)) return false;
      usedSlotIds.add(slot.id);
      return true;
    });
  const templateSlots = normalizeWorkspaceTemplateSlots(
    [...existingTemplateSlots, ...replacementSlots],
    workspace.activeLayerId,
  );

  return {
    ...workspace,
    sessions,
    templateSlots,
  };
}

export function serializedMetadataBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function cloudLibraryUsage({
  workspaces,
  templates,
  quotaBytes = CLOUD_METADATA_QUOTA_BYTES,
  isUnlimited = false,
}: {
  workspaces: SerializedWorkspace[];
  templates: SerializedWorkspaceTemplate[];
  quotaBytes?: number;
  isUnlimited?: boolean;
}): Extract<CloudUsageState, { status: "ready" }> {
  const usedBytes = [...workspaces, ...templates].reduce(
    (total, item) => total + serializedMetadataBytes(item),
    0,
  );

  return {
    status: "ready",
    usedBytes,
    quotaBytes,
    isUnlimited,
    layoutCount: workspaces.length,
    templateCount: templates.length,
  };
}

export function formatCloudBytes(bytes: number) {
  const abs = Math.max(0, bytes);
  const mebibytes = abs / 1024 ** 2;
  if (mebibytes >= 1) return `${mebibytes.toFixed(1)} MB`;

  const kibibytes = abs / 1024;
  if (kibibytes >= 1) return `${kibibytes.toFixed(1)} KB`;

  return `${abs} B`;
}

export function cloudUsageLabel(usage: CloudUsageState) {
  if (usage.status === "ready") {
    if (usage.isUnlimited)
      return `${formatCloudBytes(usage.usedBytes)} / Unlimited`;
    return `${formatCloudBytes(usage.usedBytes)} / ${formatCloudBytes(usage.quotaBytes)}`;
  }

  if (usage.status === "loading") return "Checking Cloud usage";
  if (usage.status === "signed-out") return "Sign in to use Cloud";
  return "Cloud unavailable";
}

export function cloudUsagePercent(usage: CloudUsageState) {
  if (usage.status !== "ready" || usage.isUnlimited || usage.quotaBytes <= 0) {
    return 0;
  }

  return Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100);
}

export function cloudCountLabel(usage: CloudUsageState) {
  if (usage.status !== "ready") return "No Cloud library loaded";

  return `${usage.layoutCount} layout${usage.layoutCount === 1 ? "" : "s"} · ${usage.templateCount} template${usage.templateCount === 1 ? "" : "s"}`;
}

export function cloudSaveBlockReason({
  account,
  usage,
}: {
  account: AccountState;
  usage: CloudUsageState;
  hasLocalSources?: boolean;
  isTemplate?: boolean;
}) {
  if (account.status !== "signed-in") return "Sign in to save to Cloud.";
  if (usage.status === "unconfigured") return "Cloud is not configured.";
  if (usage.status === "loading") return "Cloud usage is still loading.";
  if (usage.status === "signed-out") return "Sign in to save to Cloud.";
  return null;
}

export function readStoredSaveTarget() {
  if (typeof window === "undefined") return "local" as SaveTarget;

  return window.localStorage.getItem(SAVE_TARGET_STORAGE_KEY) === "cloud"
    ? "cloud"
    : "local";
}

export function writeStoredSaveTarget(target: SaveTarget) {
  window.localStorage.setItem(SAVE_TARGET_STORAGE_KEY, target);
}
