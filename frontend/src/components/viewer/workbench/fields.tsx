import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DirectoryInputProps = ComponentProps<typeof Input> & {
  directory?: string;
  webkitdirectory?: string;
};

export function NumberField({
  label,
  value,
  min,
  max,
  icon,
  hideLabel,
  className,
  inputClassName,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
  inputClassName?: string;
  onChange: (value: number) => void;
}) {
  if (icon) {
    return (
      <Label
        className={cn(
          "flex h-8 w-full min-w-20 items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 px-1 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center text-muted-foreground"
        >
          {icon}
        </span>
        <Input
          aria-label={label}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className={cn(
            "h-6 w-11 border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground",
            inputClassName,
          )}
        />
      </Label>
    );
  }

  return (
    <Label
      className={cn(
        hideLabel
          ? "flex w-full min-w-20 items-center text-[11px] text-muted-foreground"
          : "grid w-full min-w-20 gap-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <Input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className={cn(
          "h-7 bg-surface-elevated text-foreground",
          hideLabel ? "w-full" : "w-20",
          inputClassName,
        )}
      />
    </Label>
  );
}

export function DirectoryInput(props: DirectoryInputProps) {
  return <Input {...props} />;
}
