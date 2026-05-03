import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CloudShareTarget } from "./cloud-save-state";
import {
  createWorkbenchOverlayIntentPreload,
  scheduleInitialWorkbenchOverlayPreload,
} from "./workbench-preload";

type WorkbenchOverlaysLoader = () => Promise<
  typeof import("./workbench-overlays")
>;

export function useWorkbenchOverlayMounting(
  loadWorkbenchOverlays: WorkbenchOverlaysLoader,
) {
  const [hasMountedOverlays, setHasMountedOverlays] = useState(false);
  const preloadWorkbenchOverlays = useMemo(
    () => createWorkbenchOverlayIntentPreload(loadWorkbenchOverlays),
    [loadWorkbenchOverlays],
  );
  useEffect(
    () =>
      scheduleInitialWorkbenchOverlayPreload(() => {
        preloadWorkbenchOverlays();
        setHasMountedOverlays(true);
      }),
    [preloadWorkbenchOverlays],
  );
  const showWorkbenchOverlays = useCallback(() => {
    preloadWorkbenchOverlays();
    setHasMountedOverlays(true);
  }, [preloadWorkbenchOverlays]);

  return {
    hasMountedOverlays,
    preloadWorkbenchOverlays,
    showWorkbenchOverlays,
  };
}

export function useWorkbenchOverlayActionWrappers({
  openEditSource,
  openSourcePanel,
  setCloudShareTarget,
  showWorkbenchOverlays,
}: {
  openEditSource: (id: string) => void;
  openSourcePanel: (
    fixedSlot?: number | null,
    templateSlotId?: string | null,
  ) => void;
  setCloudShareTarget: (
    target: SetStateAction<CloudShareTarget | null>,
  ) => void;
  showWorkbenchOverlays: () => void;
}) {
  const setCloudShareTargetWithOverlay = useCallback(
    (target: SetStateAction<CloudShareTarget | null>) => {
      if (typeof target !== "function" && target) {
        showWorkbenchOverlays();
      }
      setCloudShareTarget(target);
    },
    [setCloudShareTarget, showWorkbenchOverlays],
  );
  const openSourcePanelWithOverlay = useCallback(
    (fixedSlot?: number | null, templateSlotId?: string | null) => {
      showWorkbenchOverlays();
      openSourcePanel(fixedSlot, templateSlotId);
    },
    [openSourcePanel, showWorkbenchOverlays],
  );
  const openEditSourceWithOverlay = useCallback(
    (id: string) => {
      showWorkbenchOverlays();
      openEditSource(id);
    },
    [openEditSource, showWorkbenchOverlays],
  );

  return {
    setCloudShareTargetWithOverlay,
    openSourcePanelWithOverlay,
    openEditSourceWithOverlay,
  };
}
