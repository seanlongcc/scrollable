import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkbenchOverlayMounting } from "./feed-workbench-overlay-actions";

describe("useWorkbenchOverlayMounting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mounts overlays after the initial preload so first open is only a state change", () => {
    const load = vi.fn<() => Promise<typeof import("./workbench-overlays")>>(
      async () => ({}) as typeof import("./workbench-overlays"),
    );

    render(<OverlayMountingProbe load={load} />);

    expect(screen.getByTestId("mounted").textContent).toBe("unmounted");

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mounted").textContent).toBe("mounted");
  });
});

function OverlayMountingProbe({
  load,
}: {
  load: () => Promise<typeof import("./workbench-overlays")>;
}) {
  const { hasMountedOverlays } = useWorkbenchOverlayMounting(load);

  return (
    <div data-testid="mounted">
      {hasMountedOverlays ? "mounted" : "unmounted"}
    </div>
  );
}
