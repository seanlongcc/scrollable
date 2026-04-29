"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const isMobileToastViewport = useMobileToastViewport();

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      {children}
      <Toaster
        richColors
        position={isMobileToastViewport ? "top-center" : "bottom-center"}
        visibleToasts={2}
        expand={false}
        gap={8}
      />
    </ThemeProvider>
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
