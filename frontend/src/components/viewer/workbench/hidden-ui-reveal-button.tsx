import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HiddenUiRevealButton({
  isVisible,
  onReveal,
}: {
  isVisible: boolean;
  onReveal: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn(
        "fixed right-3 top-3 z-50 border-border bg-background/95 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-opacity duration-300",
        !isVisible && "pointer-events-none opacity-0",
      )}
      onClick={onReveal}
      onFocus={onReveal}
      aria-label="Show UI"
    >
      <Eye />
      Show UI
    </Button>
  );
}
