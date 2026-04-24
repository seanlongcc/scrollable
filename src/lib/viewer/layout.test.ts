import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIXED_GRID,
  createFixedGrid,
  createFreeRect,
  findAvailableFreeRect,
  freeRectsOverlap,
  validateFreeRects,
} from "./layout";

describe("viewer layout", () => {
  it("defaults fixed layout to 2x1 side by side", () => {
    expect(DEFAULT_FIXED_GRID).toEqual({ columns: 2, rows: 1 });
  });

  it("accepts fixed dimensions from 1 through 8", () => {
    expect(createFixedGrid(1, 8)).toEqual({ columns: 1, rows: 8 });
    expect(createFixedGrid(8, 1)).toEqual({ columns: 8, rows: 1 });
  });

  it("rejects fixed dimensions outside 1 through 8", () => {
    expect(() => createFixedGrid(0, 2)).toThrow("Grid columns must be 1-8");
    expect(() => createFixedGrid(2, 9)).toThrow("Grid rows must be 1-8");
  });

  it("rejects free rectangles outside the 8x8 canvas", () => {
    expect(() =>
      createFreeRect({ column: 8, row: 1, columnSpan: 2, rowSpan: 1 }),
    ).toThrow("Free layout rectangle must fit inside the 8x8 canvas");
  });

  it("detects free layout collisions", () => {
    const first = createFreeRect({
      column: 1,
      row: 1,
      columnSpan: 3,
      rowSpan: 3,
    });
    const second = createFreeRect({
      column: 3,
      row: 3,
      columnSpan: 2,
      rowSpan: 2,
    });
    const third = createFreeRect({
      column: 4,
      row: 1,
      columnSpan: 2,
      rowSpan: 2,
    });

    expect(freeRectsOverlap(first, second)).toBe(true);
    expect(freeRectsOverlap(first, third)).toBe(false);
    expect(() => validateFreeRects([first, second])).toThrow(
      "Free layout views cannot overlap",
    );
  });

  it("places free views in the first open 2x2 block", () => {
    expect(findAvailableFreeRect([])).toEqual({
      column: 1,
      row: 1,
      columnSpan: 2,
      rowSpan: 2,
    });

    expect(
      findAvailableFreeRect([
        { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
      ]),
    ).toEqual({
      column: 3,
      row: 1,
      columnSpan: 2,
      rowSpan: 2,
    });
  });

  it("falls back to a 1x1 free slot when no 2x2 block fits", () => {
    const occupied = [
      { column: 1, row: 1, columnSpan: 7, rowSpan: 8 },
      { column: 8, row: 1, columnSpan: 1, rowSpan: 7 },
    ];

    expect(findAvailableFreeRect(occupied)).toEqual({
      column: 8,
      row: 8,
      columnSpan: 1,
      rowSpan: 1,
    });
  });

  it("returns null when the free layout has no space left", () => {
    expect(
      findAvailableFreeRect([{ column: 1, row: 1, columnSpan: 8, rowSpan: 8 }]),
    ).toBeNull();
  });
});
