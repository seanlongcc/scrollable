import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  scheduleDeferredWorkbenchTask,
  scheduleWorkbenchOverlayPreload,
  WORKBENCH_OVERLAY_PRELOAD_DELAY_MS,
} from "./workbench-preload";

describe("scheduleWorkbenchOverlayPreload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits past the initial load window before preloading overlays", () => {
    const load = vi.fn();

    scheduleWorkbenchOverlayPreload(load);

    vi.advanceTimersByTime(WORKBENCH_OVERLAY_PRELOAD_DELAY_MS - 1);
    expect(load).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("cancels delayed preload work", () => {
    const load = vi.fn();
    const cleanup = scheduleWorkbenchOverlayPreload(load);

    cleanup();
    vi.advanceTimersByTime(WORKBENCH_OVERLAY_PRELOAD_DELAY_MS);

    expect(load).not.toHaveBeenCalled();
  });

  it("uses idle time after the delay when the browser supports it", () => {
    const load = vi.fn();
    const idleCallbacks: IdleRequestCallback[] = [];
    const win = {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      requestIdleCallback: vi.fn((callback: IdleRequestCallback) => {
        idleCallbacks.push(callback);
        return 7;
      }),
      cancelIdleCallback: vi.fn(),
    };

    scheduleWorkbenchOverlayPreload(load, win);
    vi.advanceTimersByTime(WORKBENCH_OVERLAY_PRELOAD_DELAY_MS);

    expect(win.requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();

    const idleCallback = idleCallbacks[0];
    if (!idleCallback) throw new Error("Expected an idle callback");
    idleCallback({
      didTimeout: false,
      timeRemaining: () => 50,
    });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("skips overlay preloading on mobile viewports", () => {
    const load = vi.fn();
    const win = {
      setTimeout: vi.fn<Window["setTimeout"]>(window.setTimeout.bind(window)),
      clearTimeout: window.clearTimeout.bind(window),
      matchMedia: createMatchMedia(true),
    };

    scheduleWorkbenchOverlayPreload(load, win);
    vi.advanceTimersByTime(WORKBENCH_OVERLAY_PRELOAD_DELAY_MS);

    expect(win.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(win.setTimeout).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("skips overlay preloading when data saver is enabled", () => {
    const load = vi.fn();
    const win = {
      setTimeout: vi.fn<Window["setTimeout"]>(window.setTimeout.bind(window)),
      clearTimeout: window.clearTimeout.bind(window),
      matchMedia: createMatchMedia(false),
      navigator: {
        connection: {
          saveData: true,
        },
      },
    };

    scheduleWorkbenchOverlayPreload(load, win);
    vi.advanceTimersByTime(WORKBENCH_OVERLAY_PRELOAD_DELAY_MS);

    expect(win.setTimeout).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("supports shorter deferred work delays for non-overlay tasks", () => {
    const load = vi.fn();

    scheduleDeferredWorkbenchTask(load, 1200);

    vi.advanceTimersByTime(1199);
    expect(load).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

function createMatchMedia(matches: boolean) {
  return vi.fn<Window["matchMedia"]>((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}
