import { cn } from "@/lib/utils";

export function sourceActionRailClass(isFocused?: boolean) {
  return cn(
    "pointer-events-none absolute top-2 left-2 z-30 grid gap-1 transition-opacity duration-200 md:left-auto md:right-2",
    "max-md:fixed max-md:top-auto max-md:bottom-[8.5rem] max-md:left-3 max-md:z-40 max-md:gap-2",
    isFocused
      ? "opacity-100"
      : "opacity-0 group-hover/source:opacity-100 group-focus-within/source:opacity-100 max-md:hidden",
  );
}
