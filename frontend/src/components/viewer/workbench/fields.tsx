import {
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DirectoryInputProps = ComponentProps<typeof Input> & {
  directory?: string;
  webkitdirectory?: string;
};

export function placeCaretAfterInputValue(input: HTMLInputElement) {
  const placeCaret = () => {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };

  if (typeof window === "undefined") {
    placeCaret();
    return;
  }

  window.requestAnimationFrame(placeCaret);
}

export function NumberField({
  label,
  value,
  min,
  max,
  icon,
  hideLabel,
  className,
  inputClassName,
  commitOnBlur = false,
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
  commitOnBlur?: boolean;
  onChange: (value: number) => void;
}) {
  const [lastValue, setLastValue] = useState(value);
  const [draftValue, setDraftValue] = useState(String(value));
  const currentDraftValue = value === lastValue ? draftValue : String(value);

  if (value !== lastValue) {
    setLastValue(value);
    setDraftValue(String(value));
  }

  function parsedDraft(valueToParse: string) {
    if (!valueToParse.trim()) return null;

    const next = Number(valueToParse);
    if (
      !Number.isInteger(next) ||
      next < min ||
      next > max ||
      !Number.isFinite(next)
    ) {
      return null;
    }

    return next;
  }

  function commitDraft() {
    const next = parsedDraft(currentDraftValue);
    if (next === null) {
      setDraftValue(String(value));
      return;
    }

    setDraftValue(String(next));
    if (next !== value) onChange(next);
  }

  function updateDraft(nextDraft: string) {
    setDraftValue(nextDraft);
    if (commitOnBlur) return;

    const next = parsedDraft(nextDraft);
    if (next !== null) onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commitDraft();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      setDraftValue(String(value));
      event.currentTarget.blur();
    }
  }

  if (icon) {
    return (
      <Label
        className={cn(
          "flex h-11 w-full min-w-20 items-center gap-1 rounded-xl border border-border/80 bg-surface-elevated/80 px-1 text-[11px] text-muted-foreground md:h-8",
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
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          value={currentDraftValue}
          min={min}
          max={max}
          step={1}
          onBlur={commitDraft}
          onChange={(event) => updateDraft(event.target.value)}
          onFocus={(event) => placeCaretAfterInputValue(event.currentTarget)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-6 min-h-0 w-11 border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground",
            "h-8 md:h-6",
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
        inputMode="numeric"
        pattern="[0-9]*"
        type="text"
        value={currentDraftValue}
        min={min}
        max={max}
        step={1}
        onBlur={commitDraft}
        onChange={(event) => updateDraft(event.target.value)}
        onFocus={(event) => placeCaretAfterInputValue(event.currentTarget)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-7 min-h-0 bg-surface-elevated text-foreground",
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
