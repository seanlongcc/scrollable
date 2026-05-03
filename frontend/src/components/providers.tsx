"use client";

import { useEffect, useState, type ReactNode } from "react";

import { LazyToaster } from "@/components/ui/lazy-toaster";

export function Providers({ children }: { children: ReactNode }) {
  const isMobileToastViewport = useMobileToastViewport();

  return (
    <>
      {children}
      <LazyToaster
        richColors
        position={isMobileToastViewport ? "top-center" : "bottom-center"}
        visibleToasts={2}
        expand={false}
        gap={8}
      />
    </>
  );
}

function useMobileToastViewport() {
  const [isMobileToastViewport, setIsMobileToastViewport] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(max-width: 767px)");

    function syncViewport() {
      setIsMobileToastViewport(query.matches);
    }

    syncViewport();
    query.addEventListener("change", syncViewport);

    return () => query.removeEventListener("change", syncViewport);
  }, []);

  return isMobileToastViewport;
}
