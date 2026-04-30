export const WORKBENCH_OVERLAY_PRELOAD_DELAY_MS = 4000;
export const WORKBENCH_AUTH_BOOTSTRAP_DELAY_MS = 500;

type WorkbenchPreloadWindow = Pick<Window, "clearTimeout" | "setTimeout"> &
  Partial<Pick<Window, "cancelIdleCallback" | "requestIdleCallback">>;

export function scheduleDeferredWorkbenchTask(
  load: () => Promise<unknown> | unknown,
  delayMs: number,
  win: WorkbenchPreloadWindow = window,
) {
  let isCancelled = false;
  let idleId: number | null = null;
  let delayId: number | null = win.setTimeout(() => {
    delayId = null;
    if (isCancelled) return;

    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(
        () => {
          idleId = null;
          if (!isCancelled) void load();
        },
        { timeout: 2000 },
      );
      return;
    }

    void load();
  }, delayMs);

  return () => {
    isCancelled = true;
    if (delayId !== null) win.clearTimeout(delayId);
    if (idleId !== null && typeof win.cancelIdleCallback === "function") {
      win.cancelIdleCallback(idleId);
    }
  };
}

export function scheduleWorkbenchOverlayPreload(
  load: () => Promise<unknown> | unknown,
  win?: WorkbenchPreloadWindow,
) {
  return scheduleDeferredWorkbenchTask(
    load,
    WORKBENCH_OVERLAY_PRELOAD_DELAY_MS,
    win,
  );
}
