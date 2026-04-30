import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LAZY_TOASTER_REQUEST_EVENT } from "@/lib/toast-events";
import { LazyToaster } from "./lazy-toaster";

const toasterMock = vi.hoisted(() => ({
  Toaster: vi.fn(({ position }: { position?: string }) => (
    <div data-testid="lazy-toaster" data-position={position} />
  )),
}));

vi.mock("./sonner", () => ({
  Toaster: toasterMock.Toaster,
}));

describe("LazyToaster", () => {
  afterEach(() => {
    toasterMock.Toaster.mockClear();
    Reflect.deleteProperty(window, "requestIdleCallback");
    Reflect.deleteProperty(window, "cancelIdleCallback");
  });

  it("does not mount Sonner before idle time or a toast request", () => {
    window.requestIdleCallback = vi.fn(() => 1);
    window.cancelIdleCallback = vi.fn();

    render(<LazyToaster position="bottom-center" />);

    expect(screen.queryByTestId("lazy-toaster")).not.toBeInTheDocument();
  });

  it("mounts Sonner when the first toast is requested", async () => {
    window.requestIdleCallback = vi.fn(() => 1);
    window.cancelIdleCallback = vi.fn();

    render(<LazyToaster position="bottom-center" />);

    window.dispatchEvent(new Event(LAZY_TOASTER_REQUEST_EVENT));

    expect(await screen.findByTestId("lazy-toaster")).toHaveAttribute(
      "data-position",
      "bottom-center",
    );
  });

  it("mounts Sonner during browser idle time", async () => {
    const idleCallbacks: IdleRequestCallback[] = [];
    window.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return 1;
    });
    window.cancelIdleCallback = vi.fn();

    render(<LazyToaster position="top-center" />);

    expect(screen.queryByTestId("lazy-toaster")).not.toBeInTheDocument();
    idleCallbacks[0]?.({
      didTimeout: false,
      timeRemaining: () => 50,
    });

    expect(await screen.findByTestId("lazy-toaster")).toHaveAttribute(
      "data-position",
      "top-center",
    );
  });
});
