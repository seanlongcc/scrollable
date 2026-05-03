import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { SelectedFreeLayoutControls } from "./selected-free-layout-controls";
import type { FeedSession } from "./types";

describe("SelectedFreeLayoutControls", () => {
  it("matches the compact grid number control layout", () => {
    render(
      <SelectedFreeLayoutControls
        selected={selectedSession()}
        onFreeRectChange={vi.fn()}
      />,
    );

    const controls = screen.getByRole("group", {
      name: "Selected free layout controls",
    });

    expect(controls).not.toHaveClass("md:col-start-2");
    expect(controls).not.toHaveClass("flex");
    expect(controls).not.toHaveClass("flex-wrap");
    expect(controls).toHaveClass("grid", "w-full", "grid-cols-2", "gap-2");
    expect(screen.getByLabelText("Free row")).toBeInTheDocument();
    expect(screen.getByLabelText("Column span")).toBeInTheDocument();
    expect(screen.getByLabelText("Row span")).toBeInTheDocument();
    expect(screen.getByLabelText("Free column")).toHaveClass(
      "w-full",
      "min-w-0",
      "flex-1",
    );
  });
});

function selectedSession(): FeedSession {
  return {
    id: "session-1",
    title: "Local source",
    layerId: "layer-1",
    timerMode: "local",
    timer: createTimerState({ durationSeconds: 10, itemCount: 0 }),
    fixedSlot: 0,
    freeRect: {
      column: 1,
      row: 1,
      columnSpan: 1,
      rowSpan: 1,
    },
    items: [],
    sourceConfig: {
      kind: "local",
      fileCount: 0,
    },
  };
}
