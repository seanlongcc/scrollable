import { Database, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LocalFileCacheStorageStatus } from "@/lib/local-uploads/file-cache";
import { cn } from "@/lib/utils";
import { centeredDialogClass, metadataBlockClass } from "./dialog-styles";

export function ClearLayoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "h-auto md:w-[min(92vw,24rem)] md:max-w-[24rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">Clear layout?</DialogTitle>
          <DialogDescription>
            Remove all sources from the current layout.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            aria-label="Confirm clear layout"
          >
            <Trash2 />
            Clear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LargeLocalCacheDialog({
  open,
  totalBytes,
  fileCount,
  storageStatus,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  totalBytes: number;
  fileCount: number;
  storageStatus?: LocalFileCacheStorageStatus;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,26rem)] md:max-w-[26rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Copy local files to browser storage?
          </DialogTitle>
          <DialogDescription>
            This will copy about {formatLocalCacheBytes(totalBytes)} into
            browser storage for auto-restore. Continue?
          </DialogDescription>
        </DialogHeader>
        <p className="text-wrap-anywhere text-sm text-muted-foreground">
          {fileCount} file{fileCount === 1 ? "" : "s"} will be cached. Firefox
          may duplicate large local uploads because persistent file handles are
          unavailable.
        </p>
        {storageStatus ? (
          <LocalCacheStatusBlock status={storageStatus} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            <Database />
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LocalCacheStorageFullDialog({
  open,
  status,
  onOpenChange,
  onClearCache,
}: {
  open: boolean;
  status: LocalFileCacheStorageStatus | null;
  onOpenChange: (open: boolean) => void;
  onClearCache: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,26rem)] md:max-w-[26rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Local file cache full
          </DialogTitle>
          <DialogDescription>
            Browser storage is full, so these files will need manual reload
            after refresh.
          </DialogDescription>
        </DialogHeader>
        {status ? <LocalCacheStatusBlock status={status} /> : null}
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onClearCache}
          >
            <Trash2 />
            Clear local media cache
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocalCacheStatusBlock({
  status,
}: {
  status: LocalFileCacheStorageStatus;
}) {
  return (
    <div className={metadataBlockClass}>
      <div>{status.label}</div>
      {status.freeLabel ? <div>{status.freeLabel}</div> : null}
    </div>
  );
}

function formatLocalCacheBytes(bytes: number) {
  const gibibytes = bytes / 1024 ** 3;
  return `${gibibytes >= 10 ? gibibytes.toFixed(0) : gibibytes.toFixed(1)} GB`;
}
