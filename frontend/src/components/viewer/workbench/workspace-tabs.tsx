import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, WheelEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "./types";
import { MAX_OPEN_WORKSPACE_TABS } from "./workspace-actions";

export function WorkspaceTabs({
  tabs,
  activeWorkspaceId,
  editingWorkspaceId,
  editingWorkspaceName,
  maxNameLength,
  onSelectWorkspace,
  onBeginWorkspaceRename,
  onEditingWorkspaceNameChange,
  onCommitWorkspaceRename,
  onCancelWorkspaceRename,
  onCloseWorkspaceTab,
  onCreateWorkspaceTab,
}: {
  tabs: WorkspaceTab[];
  activeWorkspaceId: string;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  maxNameLength: number;
  onSelectWorkspace: (id: string) => void;
  onBeginWorkspaceRename: (tab: WorkspaceTab) => void;
  onEditingWorkspaceNameChange: (name: string) => void;
  onCommitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCreateWorkspaceTab: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const isAtTabLimit = tabs.length >= MAX_OPEN_WORKSPACE_TABS;
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    isOverflowing: false,
  });

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") onCommitWorkspaceRename();
    if (event.key === "Escape") onCancelWorkspaceRename();
  }

  function updateScrollState() {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setScrollState({
      canScrollLeft: rail.scrollLeft > 2,
      canScrollRight: rail.scrollLeft < maxScrollLeft - 2,
      isOverflowing: maxScrollLeft > 2,
    });
  }

  function scrollTabs(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(160, rail.clientWidth * 0.7),
      behavior: "smooth",
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    if (maxScrollLeft <= 0) return;

    const delta =
      Math.abs(event.deltaY) > Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (delta === 0) return;

    event.preventDefault();
    rail.scrollLeft += delta;
    updateScrollState();
  }

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(updateScrollState)
        : null;
    resizeObserver?.observe(rail);
    window.addEventListener("resize", updateScrollState);
    rail.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
      rail.removeEventListener("scroll", updateScrollState);
    };
  }, [tabs.length]);

  useEffect(() => {
    const rail = railRef.current;
    const activeTab = rail
      ? findWorkspaceTabElement(rail, activeWorkspaceId)
      : null;

    if (!activeTab) return;

    activeTab.scrollIntoView({ block: "nearest", inline: "center" });
    const frameId = window.requestAnimationFrame(updateScrollState);

    return () => window.cancelAnimationFrame(frameId);
  }, [activeWorkspaceId, tabs.length]);

  return (
    <div className="relative w-full min-w-0">
      {scrollState.canScrollLeft ? (
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          className="absolute top-1/2 left-0 z-10 -translate-x-[calc(100%+0.25rem)] -translate-y-1/2 rounded-full bg-background/90 shadow-[0_8px_24px_rgba(18,10,10,0.45)] backdrop-blur"
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft />
        </Button>
      ) : null}
      <div
        ref={railRef}
        className="flex w-full min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onWheel={handleWheel}
      >
        <div
          className={cn(
            "flex min-w-max items-center gap-1",
            !scrollState.isOverflowing && "mx-auto",
          )}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              data-workspace-tab-id={tab.id}
              className={cn(
                "flex h-8 min-w-28 overflow-hidden rounded-full border font-mono text-muted-foreground transition",
                tab.id === activeWorkspaceId
                  ? "border-primary/55 bg-primary/10 text-foreground shadow-[0_0_0_1px_oklch(62%_0.145_18_/_0.16)]"
                  : "border-border/50 bg-surface/65 hover:bg-surface-elevated",
              )}
            >
              {editingWorkspaceId === tab.id ? (
                <input
                  aria-label={`Rename ${tab.name}`}
                  value={editingWorkspaceName}
                  autoFocus
                  onChange={(event) =>
                    onEditingWorkspaceNameChange(event.target.value)
                  }
                  maxLength={maxNameLength}
                  onBlur={onCommitWorkspaceRename}
                  onKeyDown={handleRenameKeyDown}
                  className="h-full min-w-0 flex-1 bg-background/70 px-2 text-left text-[11px] text-foreground outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectWorkspace(tab.id)}
                  onDoubleClick={() => onBeginWorkspaceRename(tab)}
                  title={`Open ${tab.name}`}
                  className="h-full min-w-0 flex-1 cursor-pointer truncate px-3 text-left text-[11px]"
                >
                  {tab.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => onCloseWorkspaceTab(tab.id)}
                aria-label={`Close ${tab.name}`}
                title={`Close ${tab.name}`}
                className="grid h-full w-7 cursor-pointer place-items-center text-muted-foreground transition hover:bg-surface-elevated hover:text-primary-hover"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-full bg-surface-elevated/50 shadow-[0_4px_14px_rgba(18,10,10,0.28)]"
            onClick={onCreateWorkspaceTab}
            disabled={isAtTabLimit}
            aria-label="New layout"
            title={
              isAtTabLimit
                ? `Maximum ${MAX_OPEN_WORKSPACE_TABS} open layouts`
                : "New layout"
            }
          >
            <Plus />
          </Button>
        </div>
      </div>
      {scrollState.canScrollRight ? (
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          className="absolute top-1/2 right-0 z-10 translate-x-[calc(100%+0.25rem)] -translate-y-1/2 rounded-full bg-background/90 shadow-[0_8px_24px_rgba(18,10,10,0.45)] backdrop-blur"
          onClick={() => scrollTabs(1)}
          aria-label="Scroll tabs right"
        >
          <ChevronRight />
        </Button>
      ) : null}
    </div>
  );
}

function findWorkspaceTabElement(root: HTMLElement, id: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return root.querySelector<HTMLElement>(
      `[data-workspace-tab-id="${CSS.escape(id)}"]`,
    );
  }

  return (
    [...root.querySelectorAll<HTMLElement>("[data-workspace-tab-id]")].find(
      (element) => element.dataset.workspaceTabId === id,
    ) ?? null
  );
}
