import Link from "next/link";

import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="scrollable.app"
      className={cn(
        "inline-flex h-16 min-h-12 items-center rounded-xl px-2.5 font-mono text-4xl font-semibold tracking-normal text-foreground outline-none hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary md:min-h-0",
        className,
      )}
    >
      scrollable.app
    </Link>
  );
}
