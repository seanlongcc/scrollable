import {
  Cloud,
  Copy,
  Download,
  FolderOpen,
  Link,
  Monitor,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Rows3,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LocalFileCacheStorageStatus } from "@/lib/local-uploads/file-cache";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  cloudUsagePercent,
  formatCloudBytes,
  type CloudShareTarget,
  type CloudUsageState,
  type SaveTarget,
} from "./cloud-save-state";
import { centeredDialogClass, metadataBlockClass } from "./dialog-styles";
import type { LibraryMetadataLabel } from "./library-metadata";

const libraryRowClass =
  "grid min-h-16 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2.5 py-2 transition-colors hover:border-primary/45 hover:bg-muted/50";

const libraryBulkButtonClass =
  "min-w-0 overflow-hidden rounded-lg px-2 font-normal md:font-normal";

const shareDialogActionButtonClass =
  "min-w-0 overflow-hidden rounded-lg px-2 font-normal md:font-normal";

export function SavedLibraryRow({
  id,
  name,
  checked,
  target,
  kind,
  metadata,
  bytes,
  onCheckedChange,
  onOpen,
  onUploadToCloud,
  onShare,
  onRename,
  onExportJson,
  onDelete,
}: {
  id: string;
  name: string;
  checked: boolean;
  target: SaveTarget;
  kind: "layout" | "template";
  metadata: LibraryMetadataLabel;
  bytes: number;
  onCheckedChange: (id: string, checked: boolean) => void;
  onOpen: (id: string) => void;
  onUploadToCloud: (id: string) => void;
  onShare: (kind: "layout" | "template", id: string) => void;
  onRename: (id: string) => void;
  onExportJson: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const isCloud = target === "cloud";
  const cloudBytes = formatCloudBytes(bytes);
  const visibleMetadata = isCloud
    ? `${metadata.visible} · ${cloudBytes}`
    : metadata.visible;
  const metadataTitle = isCloud
    ? `${metadata.title} · ${cloudBytes}`
    : metadata.title;

  return (
    <div
      className={libraryRowClass}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest("[data-library-row-action]")
        ) {
          return;
        }
        onCheckedChange(id, !checked);
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(id, event.target.checked)}
        aria-label={`Select ${name}`}
        data-library-row-action
        className="mt-0.5 size-4 accent-primary"
      />
      <div className="min-w-0 leading-tight">
        <div className="min-w-0">
          <div
            className="text-wrap-anywhere line-clamp-2 font-medium"
            title={name}
          >
            {name}
          </div>
        </div>
        <div
          className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] leading-4 text-muted-foreground tabular-nums"
          title={metadataTitle}
        >
          {visibleMetadata}
        </div>
      </div>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            data-library-row-action
            className="size-10 min-h-10 min-w-10 md:size-8 md:min-h-0 md:min-w-0"
            aria-label={`More actions for ${name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            role="menu"
            aria-label={`Actions for ${name}`}
            side="right"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-60 grid min-w-44 gap-1 rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-[0_16px_48px_rgba(18,10,10,0.55)] outline-none data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
          >
            <LibraryMenuItem
              icon={<FolderOpen />}
              label="Open"
              onSelect={() => onOpen(id)}
            />
            {!isCloud ? (
              <LibraryMenuItem
                icon={<UploadCloud />}
                label="Upload to Cloud"
                onSelect={() => onUploadToCloud(id)}
              />
            ) : (
              <LibraryMenuItem
                icon={<Link />}
                label="Share"
                onSelect={() => onShare(kind, id)}
              />
            )}
            <LibraryMenuItem
              icon={<Pencil />}
              label="Rename"
              onSelect={() => onRename(id)}
            />
            <LibraryMenuItem
              icon={<Download />}
              label="Export JSON"
              onSelect={() => onExportJson(kind, id, target)}
            />
            <LibraryMenuItem
              destructive
              icon={<Trash2 />}
              label="Delete"
              onSelect={() => onDelete(id)}
            />
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

function LibraryMenuItem({
  icon,
  label,
  destructive,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuPrimitive.Item
      asChild
      onSelect={() => {
        onSelect();
      }}
    >
      <button
        type="button"
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted",
          destructive && "text-destructive hover:bg-destructive/15",
        )}
      >
        <span className="shrink-0 [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
      </button>
    </DropdownMenuPrimitive.Item>
  );
}

async function copyShareUrl(shareUrl: string) {
  if (!navigator.clipboard?.writeText) {
    toast.error("Clipboard unavailable");
    return;
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy link");
  }
}

export function SavedLibraryBulkActions({
  kind,
  selectedCount,
  hasItems,
  allSelected,
  onSelectAll,
  onOpenSelected,
  onImportJson,
}: {
  kind: "layouts" | "templates";
  selectedCount: number;
  hasItems: boolean;
  allSelected: boolean;
  onSelectAll: () => void;
  onOpenSelected: () => void;
  onImportJson: () => void;
}) {
  const noun = kind === "layouts" ? "layouts" : "templates";
  const selectLabel = allSelected
    ? `Deselect all ${noun}`
    : `Select all ${noun}`;

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={onSelectAll}
        disabled={!hasItems}
        aria-label={selectLabel}
        className={libraryBulkButtonClass}
      >
        <Rows3 />
        <span className="min-w-0 truncate">
          {allSelected ? "Deselect all" : "Select all"}
        </span>
      </Button>
      <Button
        type="button"
        onClick={onOpenSelected}
        disabled={selectedCount === 0}
        aria-label={`Open selected ${noun}`}
        className={libraryBulkButtonClass}
      >
        <FolderOpen />
        <span className="min-w-0 truncate">Open</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onImportJson}
        aria-label="Import JSON"
        className="w-12 px-0"
      >
        <Upload />
      </Button>
    </div>
  );
}

export function StorageBadge({ target }: { target: SaveTarget }) {
  const isCloud = target === "cloud";

  return (
    <Badge
      variant={isCloud ? "default" : "outline"}
      className="h-5 gap-1 px-1.5 text-[10px]"
    >
      {isCloud ? <Cloud /> : <Monitor />}
      {isCloud ? "Cloud" : "Local"}
    </Badge>
  );
}

export function ShareLinkDialog({
  target,
  onOpenChange,
  onRegenerate,
  onDisable,
}: {
  target: CloudShareTarget | null;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (target: CloudShareTarget) => void;
  onDisable: (target: CloudShareTarget) => void;
}) {
  const shareUrl = target
    ? (target.url ??
      `${window.location.origin}/share/${target.kind}/${target.id}`)
    : "";

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,25rem)] md:max-w-[25rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">Share link</DialogTitle>
          <DialogDescription className="sr-only">
            Copy, regenerate, or disable the Cloud share link.
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="grid gap-3">
            <div className={metadataBlockClass}>
              <div className="flex min-w-0 items-center gap-2">
                <StorageBadge target="cloud" />
                <p
                  className="text-wrap-anywhere line-clamp-2 font-medium"
                  title={target.name}
                >
                  {target.name}
                </p>
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                {shareUrl}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                onClick={() => void copyShareUrl(shareUrl)}
                className={shareDialogActionButtonClass}
              >
                <Copy />
                <span className="min-w-0 truncate">Copy link</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onRegenerate(target)}
                className={shareDialogActionButtonClass}
              >
                <RefreshCw />
                <span className="min-w-0 truncate">Regenerate</span>
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDisable(target)}
              className={shareDialogActionButtonClass}
            >
              <Trash2 />
              <span className="min-w-0 truncate">Disable</span>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function CloudUsageMeter({
  usage,
  className,
  label = "Cloud metadata usage",
}: {
  usage: CloudUsageState;
  className?: string;
  label?: string;
}) {
  const percent = cloudUsagePercent(usage);
  const roundedPercent = Math.round(percent);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedPercent}
      className={cn("h-1.5 overflow-hidden rounded-full bg-input", className)}
    >
      <div
        className={cn(
          "h-full w-full origin-left rounded-full bg-primary transition-transform",
          usage.status === "ready" &&
            !usage.isUnlimited &&
            percent >= 90 &&
            "bg-destructive",
        )}
        style={{
          transform: `scaleX(${(usage.status === "ready" ? percent : 0) / 100})`,
        }}
      />
    </div>
  );
}

export function LocalCacheUsageMeter({
  status,
  className,
}: {
  status: LocalFileCacheStorageStatus | null;
  className?: string;
}) {
  const percent = status?.usagePercent ?? localCacheUsagePercent(status);
  const roundedPercent = Math.round(percent);

  return (
    <div
      role="meter"
      aria-label="Local media cache usage"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedPercent}
      className={cn("h-1.5 overflow-hidden rounded-full bg-input", className)}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-secondary transition-transform"
        style={{ transform: `scaleX(${percent / 100})` }}
      />
    </div>
  );
}

export function localCacheUsageText(
  status: LocalFileCacheStorageStatus | null,
) {
  if (!status) return "Local cache usage unavailable";
  return status.label.replace(/^Local cache:\s*/, "");
}

function localCacheUsagePercent(status: LocalFileCacheStorageStatus | null) {
  if (!status?.usageBytes || !status.quotaBytes || status.quotaBytes <= 0) {
    return localCacheUsagePercentFromLabel(status?.label);
  }

  return Math.min(100, (status.usageBytes / status.quotaBytes) * 100);
}

function localCacheUsagePercentFromLabel(label: string | undefined) {
  const match = label?.match(/([0-9.]+) GB \/ ([0-9.]+) GB used/);
  if (!match) return 0;

  const used = Number(match[1]);
  const quota = Number(match[2]);
  if (!Number.isFinite(used) || !Number.isFinite(quota) || quota <= 0) {
    return 0;
  }

  return Math.min(100, (used / quota) * 100);
}
