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

export function createWorkbenchOverlayIntentPreload(
  load: () => Promise<unknown> | unknown,
) {
  let hasPreloaded = false;

  return () => {
    if (hasPreloaded) return;

    hasPreloaded = true;
    void load();
  };
}

export function scheduleInitialWorkbenchOverlayPreload(
  load: () => Promise<unknown> | unknown,
  win: WorkbenchPreloadWindow = window,
) {
  let isCancelled = false;
  const preloadId = win.setTimeout(() => {
    if (!isCancelled) void load();
  }, 0);

  return () => {
    isCancelled = true;
    win.clearTimeout(preloadId);
  };
}
