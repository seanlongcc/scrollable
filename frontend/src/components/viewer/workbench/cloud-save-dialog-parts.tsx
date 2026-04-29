import {
  Cloud,
  Copy,
  Download,
  FolderOpen,
  Link,
  Monitor,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  cloudUsagePercent,
  formatCloudBytes,
  type CloudShareTarget,
  type CloudUsageState,
  type SaveTarget,
} from "./cloud-save-state";

const centeredDialogClass =
  "top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-t-3xl border border-border/70 bg-surface text-popover-foreground shadow-[0_-22px_74px_rgba(0,0,0,0.62)] sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.72)]";

const libraryRowClass =
  "grid h-14 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-2.5 py-2 transition-colors hover:border-primary/45 hover:bg-muted/50";

const metadataBlockClass =
  "rounded-2xl border border-border/70 bg-background/65 p-3 text-sm text-muted-foreground";

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
  onExportJson,
  onDelete,
}: {
  id: string;
  name: string;
  checked: boolean;
  target: SaveTarget;
  kind: "layout" | "template";
  metadata: string;
  bytes: number;
  onCheckedChange: (id: string, checked: boolean) => void;
  onOpen: (id: string) => void;
  onUploadToCloud: (id: string) => void;
  onShare: (kind: "layout" | "template", id: string) => void;
  onExportJson: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isCloud = target === "cloud";

  return (
    <label className={libraryRowClass}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(id, event.target.checked)}
        aria-label={`Select ${name}`}
        className="mt-0.5 size-4 accent-primary"
      />
      <div className="min-w-0 leading-tight">
        <div className="flex min-w-0 items-center gap-1.5">
          <StorageBadge target={target} />
          <div className="truncate font-medium" title={name}>
            {name}
          </div>
        </div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {metadata}
          {isCloud ? ` · ${formatCloudBytes(bytes)}` : ""}
        </div>
      </div>
      <div className="relative shrink-0">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-10 min-h-10 min-w-10 md:size-8 md:min-h-0 md:min-w-0"
          aria-label={`More actions for ${name}`}
          aria-expanded={isMenuOpen}
          onClick={(event) => {
            event.preventDefault();
            setIsMenuOpen((current) => !current);
          }}
        >
          <MoreHorizontal />
        </Button>
        {isMenuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 grid min-w-40 gap-1 rounded-xl border border-border/80 bg-popover p-1 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
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
          </div>
        ) : null}
      </div>
    </label>
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
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted",
        destructive && "text-destructive hover:bg-destructive/15",
      )}
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {label}
    </button>
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
                <p className="truncate font-medium" title={target.name}>
                  {target.name}
                </p>
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                {shareUrl}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(shareUrl)}
              >
                <Copy />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onRegenerate(target)}
              >
                <RefreshCw />
                Regenerate
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDisable(target)}
            >
              <Trash2 />
              Disable
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
}: {
  usage: CloudUsageState;
  className?: string;
}) {
  const percent = cloudUsagePercent(usage);

  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-input", className)}
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width]",
          usage.status === "ready" &&
            !usage.isUnlimited &&
            percent >= 90 &&
            "bg-destructive",
        )}
        style={{
          width: `${usage.status === "ready" ? Math.max(4, percent) : 0}%`,
        }}
      />
    </div>
  );
}
