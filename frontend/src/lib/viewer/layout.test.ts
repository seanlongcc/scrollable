import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIXED_GRID,
  FREE_LAYOUT_SIZE,
  createFixedGrid,
  createFreeRect,
  findAvailableFreeRectsBySize,
  findBestAvailableFreeRects,
  findAvailableFreeRect,
  freeRectsOverlap,
  validateFreeRects,
} from "./layout";

describe("viewer layout", () => {
  it("defaults fixed layout to a 2x1 grid", () => {
    expect(DEFAULT_FIXED_GRID).toEqual({ columns: 2, rows: 1 });
  });

  it("uses a 16x16 layout canvas", () => {
    expect(FREE_LAYOUT_SIZE).toBe(16);
  });

  it("accepts fixed dimensions from 1 through 16", () => {
    expect(createFixedGrid(1, 16)).toEqual({ columns: 1, rows: 16 });
    expect(createFixedGrid(16, 1)).toEqual({ columns: 16, rows: 1 });
  });

  it("rejects fixed dimensions outside 1 through 16", () => {
    expect(() => createFixedGrid(0, 2)).toThrow("Grid columns must be 1-16");
    expect(() => createFixedGrid(2, 17)).toThrow("Grid rows must be 1-16");
  });

  it("rejects free rectangles outside the 16x16 canvas", () => {
    expect(() =>
      createFreeRect({ column: 16, row: 1, columnSpan: 2, rowSpan: 1 }),
    ).toThrow("Free layout rectangle must fit inside the 16x16 canvas");
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

  it("places free views in the first open 4x4 block by default", () => {
    expect(findAvailableFreeRect([])).toEqual({
      column: 1,
      row: 1,
      columnSpan: 4,
      rowSpan: 4,
    });

    expect(
      findAvailableFreeRect([{ column: 1, row: 1, columnSpan: 4, rowSpan: 4 }]),
    ).toEqual({
      column: 5,
      row: 1,
      columnSpan: 4,
      rowSpan: 4,
    });
  });

  it("falls back to a 1x1 free slot when no 4x4 block fits", () => {
    const occupied = [
      { column: 1, row: 1, columnSpan: 15, rowSpan: 16 },
      { column: 16, row: 1, columnSpan: 1, rowSpan: 15 },
    ];

    expect(findAvailableFreeRect(occupied)).toEqual({
      column: 16,
      row: 16,
      columnSpan: 1,
      rowSpan: 1,
    });
  });

  it("returns null when the free layout has no space left", () => {
    expect(
      findAvailableFreeRect([
        { column: 1, row: 1, columnSpan: 16, rowSpan: 16 },
      ]),
    ).toBeNull();
  });

  it("chooses 1x1 slots when many free rectangles are needed", () => {
    const rects = findBestAvailableFreeRects([], 255);

    expect(rects).toHaveLength(255);
    expect(
      rects.every((rect) => rect.columnSpan === 1 && rect.rowSpan === 1),
    ).toBe(true);
  });

  it("duplicates into open free rectangles using the selected source size", () => {
    expect(
      findAvailableFreeRectsBySize(
        [{ column: 1, row: 1, columnSpan: 4, rowSpan: 4 }],
        3,
        { columnSpan: 4, rowSpan: 4 },
      ),
    ).toEqual([
      { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
      { column: 9, row: 1, columnSpan: 4, rowSpan: 4 },
      { column: 13, row: 1, columnSpan: 4, rowSpan: 4 },
    ]);
  });
});
