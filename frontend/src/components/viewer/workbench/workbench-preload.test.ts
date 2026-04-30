import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWorkbenchOverlayIntentPreload,
  scheduleDeferredWorkbenchTask,
} from "./workbench-preload";

describe("createWorkbenchOverlayIntentPreload", () => {
  it("waits for explicit user intent before preloading overlays", () => {
    const load = vi.fn();

    createWorkbenchOverlayIntentPreload(load);

    expect(load).not.toHaveBeenCalled();
  });

  it("preloads overlays once across hover, focus, and open intent", () => {
    const load = vi.fn();
    const preload = createWorkbenchOverlayIntentPreload(load);

    preload();
    preload();
    preload();

    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleDeferredWorkbenchTask", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    scheduleDeferredWorkbenchTask(load, 4000, win);
    vi.advanceTimersByTime(4000);

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

  it("supports shorter deferred work delays for non-overlay tasks", () => {
    const load = vi.fn();

    scheduleDeferredWorkbenchTask(load, 1200);

    vi.advanceTimersByTime(1199);
    expect(load).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
