import Link from "next/link";

import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="scrollable.app"
      className={cn(
        "inline-flex min-h-12 w-fit items-center rounded-xl px-2.5 font-heading text-[2.7rem] leading-none font-normal tracking-normal text-foreground outline-none hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary md:min-h-0 md:px-0.5 md:py-0",
        className,
      )}
    >
      scrollable.app
    </Link>
  );
}
