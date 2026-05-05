import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { toast } from "@/lib/toast";
import { accountStateFromUser } from "./account-actions";
import type { CloudUsageState, SaveTarget } from "./cloud-save-state";
import { writeStoredSaveTarget } from "./cloud-save-state";
import { visibleUrlRuntimeHydrationCandidates } from "./runtime-hydration-actions";
import type {
  AccountState,
  FeedSession,
  FreeDragState,
  LayoutMode,
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  advanceSessionTimers,
  HIDDEN_UI_REVEAL_TIMEOUT_MS,
  keyboardTimerMoveDirection,
  moveActiveKeyboardSessionTimer,
} from "./workbench-effect-state";
import {
  restoreWorkspaceBootstrap,
  writeWorkspaceSessionStore,
} from "./workspace-state";
import {
  scheduleDeferredWorkbenchTask,
  WORKBENCH_AUTH_BOOTSTRAP_DELAY_MS,
} from "./workbench-preload";

export function useFeedWorkbenchEffects({
  accountStatus,
  activeKeyboardSessionId,
  activeLayerId,
  applyWorkspaceSnapshot,
  commitFreeDrag,
  freeDrag,
  galleryIndexes,
  hydrateRuntimeItems,
  initialWorkspace,
  isUiHidden,
  layoutMode,
  refreshCloudLibrary,
  registryRef,
  saveTarget,
  sessions,
  finishVideoBeforeAdvance,
  finishedVideoKeys,
  setAccount,
  setActiveWorkspaceId,
  setCloudTemplates,
  setCloudUsage,
  setCloudWorkspaces,
  setIsUiHidden,
  setIsUiRevealVisible,
  setSavedTemplates,
  setSavedWorkspaces,
  setSessions,
  setWorkspaceStates,
  setWorkspaceTabs,
  updateFreeDrag,
  visibleFixedCells,
}: {
  accountStatus: AccountState["status"];
  activeKeyboardSessionId: string | null;
  activeLayerId: string;
  applyWorkspaceSnapshot: (
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) => void;
  commitFreeDrag: (drag: FreeDragState) => void;
  freeDrag: FreeDragState | null;
  galleryIndexes: Record<string, number>;
  hydrateRuntimeItems: (sessions: FeedSession[]) => Promise<void>;
  initialWorkspace: WorkspaceTab;
  isUiHidden: boolean;
  layoutMode: LayoutMode;
  refreshCloudLibrary: (isAccountSignedIn?: boolean) => Promise<void>;
  registryRef: RefObject<LocalObjectUrlRegistry | null>;
  saveTarget: SaveTarget;
  sessions: FeedSession[];
  finishVideoBeforeAdvance: boolean;
  finishedVideoKeys: Record<string, boolean>;
  setAccount: Dispatch<SetStateAction<AccountState>>;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  setCloudTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setCloudUsage: Dispatch<SetStateAction<CloudUsageState>>;
  setCloudWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setIsUiHidden: Dispatch<SetStateAction<boolean>>;
  setIsUiRevealVisible: Dispatch<SetStateAction<boolean>>;
  setSavedTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setSavedWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
  setWorkspaceStates: Dispatch<
    SetStateAction<Record<string, RuntimeWorkspace>>
  >;
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  updateFreeDrag: (event: PointerEvent, drag: FreeDragState) => void;
  visibleFixedCells: number;
}) {
  useObjectUrlCleanup(registryRef);
  useStoredSaveTargetEffect(saveTarget);
  useAccountBootstrap(setAccount);
  useSignedInToast();
  useCloudLibraryRefresh({
    accountStatus,
    refreshCloudLibrary,
    setCloudTemplates,
    setCloudUsage,
    setCloudWorkspaces,
  });
  useWorkspaceBootstrap({
    applyWorkspaceSnapshot,
    initialWorkspace,
    setActiveWorkspaceId,
    setSavedTemplates,
    setSavedWorkspaces,
    setWorkspaceStates,
    setWorkspaceTabs,
  });
  useSessionTimerAdvancement({
    sessions,
    galleryIndexes,
    finishVideoBeforeAdvance,
    finishedVideoKeys,
    setSessions,
  });
  useFreeDragPointerTracking({ commitFreeDrag, freeDrag, updateFreeDrag });
  useHiddenUiEscape({ isUiHidden, setIsUiHidden });
  useVisibleUrlHydration({
    activeLayerId,
    hydrateRuntimeItems,
    layoutMode,
    sessions,
    visibleFixedCells,
  });
  useKeyboardSessionTimer({
    activeKeyboardSessionId,
    setSessions,
  });
  useHiddenUiReveal({
    isUiHidden,
    setIsUiRevealVisible,
  });
}

function useObjectUrlCleanup(
  registryRef: RefObject<LocalObjectUrlRegistry | null>,
) {
  useEffect(() => {
    const registry = registryRef;
    return () => registry.current?.revokeAll();
  }, [registryRef]);
}

function useStoredSaveTargetEffect(saveTarget: SaveTarget) {
  useEffect(() => {
    writeStoredSaveTarget(saveTarget);
  }, [saveTarget]);
}

function useAccountBootstrap(
  setAccount: Dispatch<SetStateAction<AccountState>>,
) {
  useEffect(() => {
    if (!getSupabaseEnv()) {
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    function bootstrapAccount() {
      void createLazySupabaseBrowserClient()
        .then((supabase) => {
          if (!isMounted) return;

          void supabase.auth
            .getUser()
            .then(({ data: { user } }) => {
              if (isMounted) setAccount(accountStateFromUser(user));
            })
            .catch(() => {
              if (isMounted) setAccount({ status: "signed-out" });
            });

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted)
              setAccount(accountStateFromUser(session?.user ?? null));
          });
          unsubscribe = () => subscription.unsubscribe();
        })
        .catch(() => {
          if (isMounted) setAccount({ status: "signed-out" });
        });
    }

    const shouldBootstrapImmediately =
      new URLSearchParams(window.location.search).get("signedIn") === "1";
    const cancelBootstrap = shouldBootstrapImmediately
      ? (bootstrapAccount(), () => undefined)
      : scheduleDeferredWorkbenchTask(
          bootstrapAccount,
          WORKBENCH_AUTH_BOOTSTRAP_DELAY_MS,
        );

    return () => {
      isMounted = false;
      cancelBootstrap();
      unsubscribe?.();
    };
  }, [setAccount]);
}

function useSignedInToast() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signedIn") !== "1") return;

    params.delete("signedIn");
    const nextSearch = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
    );
    toast.success("Signed in");
  }, []);
}

function useCloudLibraryRefresh({
  accountStatus,
  refreshCloudLibrary,
  setCloudTemplates,
  setCloudUsage,
  setCloudWorkspaces,
}: {
  accountStatus: AccountState["status"];
  refreshCloudLibrary: (isAccountSignedIn?: boolean) => Promise<void>;
  setCloudTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setCloudUsage: Dispatch<SetStateAction<CloudUsageState>>;
  setCloudWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
}) {
  useEffect(() => {
    let frame: number | undefined;

    if (accountStatus === "signed-in") {
      const refreshFrame = window.requestAnimationFrame(() => {
        void refreshCloudLibrary(true);
      });
      return () => window.cancelAnimationFrame(refreshFrame);
    }

    if (accountStatus === "signed-out") {
      frame = window.requestAnimationFrame(() => {
        setCloudWorkspaces({});
        setCloudTemplates({});
        setCloudUsage({ status: "signed-out" });
      });
    }

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [
    accountStatus,
    refreshCloudLibrary,
    setCloudTemplates,
    setCloudUsage,
    setCloudWorkspaces,
  ]);
}

function useWorkspaceBootstrap({
  applyWorkspaceSnapshot,
  initialWorkspace,
  setActiveWorkspaceId,
  setSavedTemplates,
  setSavedWorkspaces,
  setWorkspaceStates,
  setWorkspaceTabs,
}: {
  applyWorkspaceSnapshot: (
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) => void;
  initialWorkspace: WorkspaceTab;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  setSavedTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setSavedWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setWorkspaceStates: Dispatch<
    SetStateAction<Record<string, RuntimeWorkspace>>
  >;
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
}) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const bootstrap = restoreWorkspaceBootstrap(initialWorkspace);

      setSavedTemplates(bootstrap.savedTemplates);
      if (
        !bootstrap.savedWorkspaces ||
        !bootstrap.workspaceTabs ||
        !bootstrap.workspaceStates ||
        !bootstrap.activeWorkspace
      ) {
        return;
      }

      setWorkspaceTabs(bootstrap.workspaceTabs);
      setSavedWorkspaces(bootstrap.savedWorkspaces);
      setWorkspaceStates(bootstrap.workspaceStates);
      setActiveWorkspaceId(bootstrap.activeWorkspace.id);
      applyWorkspaceSnapshot(bootstrap.activeWorkspace);
      writeWorkspaceSessionStore(
        bootstrap.workspaceTabs,
        bootstrap.activeWorkspace.id,
        bootstrap.savedWorkspaces,
      );
    });

    return () => window.cancelAnimationFrame(frame);
    // localStorage workspace bootstrap is intentionally one-shot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function useSessionTimerAdvancement({
  sessions,
  galleryIndexes,
  finishVideoBeforeAdvance,
  finishedVideoKeys,
  setSessions,
}: {
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  finishVideoBeforeAdvance: boolean;
  finishedVideoKeys: Record<string, boolean>;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
}) {
  const hasAdvancingTimers = sessions.some(
    (session) =>
      !session.timer.isPaused &&
      session.timer.itemCount > 0 &&
      session.timer.durationSeconds > 0,
  );

  useEffect(() => {
    if (!hasAdvancingTimers) return;

    const interval = window.setInterval(() => {
      setSessions((current) =>
        advanceSessionTimers(current, undefined, {
          finishVideoBeforeAdvance,
          finishedVideoKeys,
          galleryIndexes,
        }),
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, [
    finishVideoBeforeAdvance,
    galleryIndexes,
    finishedVideoKeys,
    hasAdvancingTimers,
    setSessions,
  ]);
}

function useFreeDragPointerTracking({
  commitFreeDrag,
  freeDrag,
  updateFreeDrag,
}: {
  commitFreeDrag: (drag: FreeDragState) => void;
  freeDrag: FreeDragState | null;
  updateFreeDrag: (event: PointerEvent, drag: FreeDragState) => void;
}) {
  const latestFreeDragRef = useRef(freeDrag);
  const activeDragKey = freeDrag
    ? `${freeDrag.targetType}:${freeDrag.id}:${freeDrag.mode}`
    : null;

  useLayoutEffect(() => {
    latestFreeDragRef.current = freeDrag;
  }, [freeDrag]);

  useEffect(() => {
    if (!freeDrag) return;
    const drag = freeDrag;

    function onPointerMove(event: PointerEvent) {
      updateFreeDrag(event, drag);
    }

    let isFinished = false;

    function finishDrag() {
      if (isFinished) return;
      isFinished = true;
      window.removeEventListener("pointermove", onPointerMove);
      commitFreeDrag(latestFreeDragRef.current ?? drag);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    window.addEventListener("blur", finishDrag);
    window.addEventListener("contextmenu", finishDrag);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", finishDrag);
      window.removeEventListener("contextmenu", finishDrag);
    };
    // Free drag installs pointer listeners only while a drag is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDragKey]);
}

function useHiddenUiEscape({
  isUiHidden,
  setIsUiHidden,
}: {
  isUiHidden: boolean;
  setIsUiHidden: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (!isUiHidden) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUiHidden(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isUiHidden, setIsUiHidden]);
}

function useVisibleUrlHydration({
  activeLayerId,
  hydrateRuntimeItems,
  layoutMode,
  sessions,
  visibleFixedCells,
}: {
  activeLayerId: string;
  hydrateRuntimeItems: (sessions: FeedSession[]) => Promise<void>;
  layoutMode: LayoutMode;
  sessions: FeedSession[];
  visibleFixedCells: number;
}) {
  useEffect(() => {
    const visibleUnresolvedUrlSessions = visibleUrlRuntimeHydrationCandidates({
      sessions,
      visibility: {
        activeLayerId,
        layoutMode,
        visibleFixedCells,
      },
    });

    if (!visibleUnresolvedUrlSessions.length) return;

    void hydrateRuntimeItems(visibleUnresolvedUrlSessions);
    // URL hydration is intentionally tied to visibility state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayerId, layoutMode, visibleFixedCells, sessions]);
}

function useKeyboardSessionTimer({
  activeKeyboardSessionId,
  setSessions,
}: {
  activeKeyboardSessionId: string | null;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = keyboardTimerMoveDirection(event);
      if (!direction || !activeKeyboardSessionId) {
        return;
      }

      event.preventDefault();
      setSessions((current) =>
        moveActiveKeyboardSessionTimer({
          sessions: current,
          activeSessionId: activeKeyboardSessionId,
          direction,
        }),
      );
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeKeyboardSessionId, setSessions]);
}

function useHiddenUiReveal({
  isUiHidden,
  setIsUiRevealVisible,
}: {
  isUiHidden: boolean;
  setIsUiRevealVisible: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (!isUiHidden) return;

    let timeoutId: number | undefined;

    function revealTemporarily() {
      setIsUiRevealVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(
        () => setIsUiRevealVisible(false),
        HIDDEN_UI_REVEAL_TIMEOUT_MS,
      );
    }

    revealTemporarily();
    window.addEventListener("pointermove", revealTemporarily);
    window.addEventListener("pointerdown", revealTemporarily);
    window.addEventListener("touchstart", revealTemporarily);
    window.addEventListener("keydown", revealTemporarily);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointermove", revealTemporarily);
      window.removeEventListener("pointerdown", revealTemporarily);
      window.removeEventListener("touchstart", revealTemporarily);
      window.removeEventListener("keydown", revealTemporarily);
    };
  }, [isUiHidden, setIsUiRevealVisible]);
}
