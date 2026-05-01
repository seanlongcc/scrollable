import { Cloud, Monitor, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LocalFileCacheStorageStatus } from "@/lib/local-uploads/file-cache";
import { cn } from "@/lib/utils";
import {
  centeredDialogClass,
  libraryTabsListClass,
  libraryTabTriggerClass,
  sectionLabelClass,
} from "./dialog-styles";
import { CloudUsageMeter, StorageBadge } from "./cloud-save-dialog-parts";
import type { CloudUsageState, SaveTarget } from "./cloud-save-state";
import { cloudUsageLabel } from "./cloud-save-state";
import { limitLayoutName } from "./helpers";
import type { AccountState, LayoutMode, SaveKind } from "./types";
import { MAX_LAYOUT_NAME_LENGTH } from "./types";

export function SaveLayoutDialog({
  open,
  onOpenChange,
  name,
  layoutMode,
  saveKind,
  saveTarget = "local",
  error,
  localCacheStatus,
  hasLocalSources = false,
  account = { status: "signed-out" },
  cloudUsage = { status: "signed-out" },
  cloudBlockReason = null,
  onNameChange,
  onSaveKindChange,
  onSaveTargetChange = () => undefined,
  onSaveLayout,
  onSaveTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  saveTarget?: SaveTarget;
  error: string | null;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  hasLocalSources?: boolean;
  account?: AccountState;
  cloudUsage?: CloudUsageState;
  cloudBlockReason?: string | null;
  onNameChange: (name: string) => void;
  onSaveKindChange: (kind: SaveKind) => void;
  onSaveTargetChange?: (target: SaveTarget) => void;
  onSaveLayout: () => void;
  onSaveTemplate: () => void;
}) {
  const activeSaveKind = layoutMode === "free" ? saveKind : "layout";
  const isCloud = saveTarget === "cloud";
  const submitDisabled = isCloud && Boolean(cloudBlockReason);
  const submitLabel = isCloud
    ? "Save to Cloud"
    : activeSaveKind === "template"
      ? "Save as template"
      : "Save as layout";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "max-h-[82dvh] md:w-[min(92vw,24rem)] md:max-w-[24rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">Save layout as</DialogTitle>
          <DialogDescription className="sr-only">
            Name the current layout and save its configuration metadata.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (activeSaveKind === "template") {
              onSaveTemplate();
            } else {
              onSaveLayout();
            }
          }}
        >
          {layoutMode === "free" ? (
            <Tabs
              value={activeSaveKind}
              onValueChange={(value) => onSaveKindChange(value as SaveKind)}
              className="gap-2"
            >
              <TabsList className={libraryTabsListClass}>
                <TabsTrigger value="layout" className={libraryTabTriggerClass}>
                  Layout
                </TabsTrigger>
                <TabsTrigger
                  value="template"
                  className={libraryTabTriggerClass}
                >
                  Template
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          <Tabs
            value={saveTarget}
            onValueChange={(value) => onSaveTargetChange(value as SaveTarget)}
            className="gap-2"
          >
            <TabsList className={libraryTabsListClass}>
              <TabsTrigger value="local" className={libraryTabTriggerClass}>
                <Monitor />
                Local
              </TabsTrigger>
              <TabsTrigger value="cloud" className={libraryTabTriggerClass}>
                <Cloud />
                Cloud
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Label className="grid gap-1.5 text-sm font-medium">
            {activeSaveKind === "template" ? "Template name" : "Layout name"}
            <Input
              value={name}
              onChange={(event) =>
                onNameChange(limitLayoutName(event.target.value))
              }
              maxLength={MAX_LAYOUT_NAME_LENGTH}
              aria-invalid={error ? true : undefined}
            />
          </Label>
          {error ? (
            <div className="text-wrap-anywhere text-xs text-destructive">
              {error}
            </div>
          ) : null}
          {isCloud ? (
            <div
              className={cn(
                "rounded-2xl border border-border/70 bg-background/65 p-3 text-sm",
                cloudBlockReason
                  ? "border-destructive/45 bg-destructive/10 text-destructive"
                  : "text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={sectionLabelClass}>Cloud metadata</span>
                <StorageBadge target="cloud" />
              </div>
              <div className="text-wrap-anywhere mt-1 font-mono text-[11px]">
                {cloudBlockReason ?? cloudUsageLabel(cloudUsage)}
              </div>
              {account.status === "signed-in" &&
              cloudUsage.status === "ready" &&
              !cloudBlockReason ? (
                <CloudUsageMeter usage={cloudUsage} className="mt-2" />
              ) : null}
              {hasLocalSources ? (
                <p className="mt-2 text-xs text-secondary">
                  Local uploads stay in this browser. Cloud saves keep their
                  boxes empty.
                </p>
              ) : null}
            </div>
          ) : localCacheStatus ? (
            <div className="text-wrap-anywhere rounded-2xl border border-border/70 bg-background/65 p-3 font-mono text-[11px] text-muted-foreground">
              <div>{localCacheStatus.label}</div>
              {localCacheStatus.freeLabel ? (
                <div>{localCacheStatus.freeLabel}</div>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" title={submitLabel} disabled={submitDisabled}>
            <Save />
            <span className="min-w-0 truncate">{submitLabel}</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
