"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ToasterProps } from "sonner";

import { LAZY_TOASTER_REQUEST_EVENT } from "@/lib/toast-events";

const Toaster = dynamic(
  () => import("./sonner").then((module) => module.Toaster),
  { ssr: false },
);

export function LazyToaster(props: ToasterProps) {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount) return;

    let isCancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    function mountToaster() {
      if (!isCancelled) setShouldMount(true);
    }

    window.addEventListener(LAZY_TOASTER_REQUEST_EVENT, mountToaster, {
      once: true,
    });

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(mountToaster, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(mountToaster, 1500);
    }

    return () => {
      isCancelled = true;
      window.removeEventListener(LAZY_TOASTER_REQUEST_EVENT, mountToaster);
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [shouldMount]);

  if (!shouldMount) return null;

  return <Toaster {...props} />;
}
