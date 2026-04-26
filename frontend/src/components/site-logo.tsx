import Link from "next/link";

import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="scrollable.app"
      className={cn(
        "inline-flex h-16 items-center rounded-lg px-2.5 font-mono text-4xl font-semibold tracking-normal text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      scrollable.app
    </Link>
  );
}
