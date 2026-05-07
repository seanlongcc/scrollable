import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SaveSourceButton({
  isSaving,
  onSave,
}: {
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onSave}
      className="w-full"
      disabled={isSaving}
    >
      {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
      {isSaving ? "Saving source" : "Save source"}
    </Button>
  );
}

export function SavingSourceOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-popover/80 text-popover-foreground backdrop-blur-sm"
    >
      <div className="grid place-items-center gap-2 rounded-lg border border-border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <span>Saving source</span>
      </div>
    </div>
  );
}
