import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  icon?: ReactNode;
  onChange: (value: number) => void;
}) {
  if (icon) {
    return (
      <Label className="flex h-8 min-w-20 items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 px-1 text-[11px] text-muted-foreground">
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
          className="h-6 w-11 border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground"
        />
      </Label>
    );
  }

  return (
    <Label className="grid min-w-20 gap-1 text-[11px] text-muted-foreground">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="h-7 w-20 bg-surface-elevated text-foreground"
      />
    </Label>
  );
}

export function DirectoryInput(props: DirectoryInputProps) {
  return <Input {...props} />;
}
