export type FixedGrid = {
  columns: number;
  rows: number;
};

export type FreeRect = {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
};

export const DEFAULT_FIXED_GRID: FixedGrid = { columns: 2, rows: 1 };
export const FREE_LAYOUT_SIZE = 16;
const FIXED_GRID_MAX = 16;
const DEFAULT_FREE_RECT_SPAN = 4;

export function createFixedGrid(columns: number, rows: number): FixedGrid {
  if (!Number.isInteger(columns) || columns < 1 || columns > FIXED_GRID_MAX) {
    throw new Error("Grid columns must be 1-16");
  }

  if (!Number.isInteger(rows) || rows < 1 || rows > FIXED_GRID_MAX) {
    throw new Error("Grid rows must be 1-16");
  }

  return { columns, rows };
}

export function createFreeRect(rect: FreeRect): FreeRect {
  const { column, row, columnSpan, rowSpan } = rect;
  const values = [column, row, columnSpan, rowSpan];

  if (values.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error("Free layout rectangle values must be positive integers");
  }

  if (
    column > FREE_LAYOUT_SIZE ||
    row > FREE_LAYOUT_SIZE ||
    column + columnSpan - 1 > FREE_LAYOUT_SIZE ||
    row + rowSpan - 1 > FREE_LAYOUT_SIZE
  ) {
    throw new Error("Free layout rectangle must fit inside the 16x16 canvas");
  }

  return { column, row, columnSpan, rowSpan };
}

export function freeRectsOverlap(first: FreeRect, second: FreeRect): boolean {
  const firstRight = first.column + first.columnSpan - 1;
  const firstBottom = first.row + first.rowSpan - 1;
  const secondRight = second.column + second.columnSpan - 1;
  const secondBottom = second.row + second.rowSpan - 1;

  return !(
    firstRight < second.column ||
    secondRight < first.column ||
    firstBottom < second.row ||
    secondBottom < first.row
  );
}

export function validateFreeRects(rects: FreeRect[]): FreeRect[] {
  const validRects = rects.map(createFreeRect);

  for (let index = 0; index < validRects.length; index += 1) {
    for (
      let nextIndex = index + 1;
      nextIndex < validRects.length;
      nextIndex += 1
    ) {
      if (freeRectsOverlap(validRects[index], validRects[nextIndex])) {
        throw new Error("Free layout views cannot overlap");
      }
    }
  }

  return validRects;
}

export function findAvailableFreeRect(
  rects: FreeRect[],
  preferredSpans: readonly number[] = [DEFAULT_FREE_RECT_SPAN, 1],
): FreeRect | null {
  const occupied = rects.map(createFreeRect);

  for (const span of preferredSpans) {
    for (let row = 1; row <= FREE_LAYOUT_SIZE - span + 1; row += 1) {
      for (let column = 1; column <= FREE_LAYOUT_SIZE - span + 1; column += 1) {
        const candidate = createFreeRect({
          column,
          row,
          columnSpan: span,
          rowSpan: span,
        });

        if (
          occupied.every(
            (occupiedRect) => !freeRectsOverlap(candidate, occupiedRect),
          )
        ) {
          return candidate;
        }
      }
    }
  }

  return null;
}

export function findAvailableFreeRectsBySize(
  rects: FreeRect[],
  count: number,
  size: Pick<FreeRect, "columnSpan" | "rowSpan">,
): FreeRect[] {
  const nextRects = rects.map(createFreeRect);
  const found: FreeRect[] = [];

  for (let index = 0; index < count; index += 1) {
    let nextRect: FreeRect | null = null;

    for (let row = 1; row <= FREE_LAYOUT_SIZE - size.rowSpan + 1; row += 1) {
      for (
        let column = 1;
        column <= FREE_LAYOUT_SIZE - size.columnSpan + 1;
        column += 1
      ) {
        const candidate = createFreeRect({
          column,
          row,
          columnSpan: size.columnSpan,
          rowSpan: size.rowSpan,
        });

        if (nextRects.every((rect) => !freeRectsOverlap(candidate, rect))) {
          nextRect = candidate;
          break;
        }
      }

      if (nextRect) break;
    }

    if (!nextRect) break;

    nextRects.push(nextRect);
    found.push(nextRect);
  }

  return found;
}

export function findAvailableFreeRects(
  rects: FreeRect[],
  count: number,
  preferredSpans: readonly number[] = [DEFAULT_FREE_RECT_SPAN, 1],
): FreeRect[] {
  const nextRects = rects.map(createFreeRect);
  const found: FreeRect[] = [];

  for (let index = 0; index < count; index += 1) {
    const rect = findAvailableFreeRect(nextRects, preferredSpans);
    if (!rect) break;

    nextRects.push(rect);
    found.push(rect);
  }

  return found;
}

export function findBestAvailableFreeRects(
  rects: FreeRect[],
  count: number,
): FreeRect[] {
  const comfortable = findAvailableFreeRects(rects, count, [
    DEFAULT_FREE_RECT_SPAN,
    1,
  ]);
  if (comfortable.length === count) return comfortable;

  const compact = findAvailableFreeRects(rects, count, [1]);
  return compact.length > comfortable.length ? compact : comfortable;
}

export function createPackedFreeRects(count: number): FreeRect[] {
  const maxCells = FREE_LAYOUT_SIZE * FREE_LAYOUT_SIZE;
  const cellCount = Math.min(Math.max(0, count), maxCells);

  return Array.from({ length: cellCount }, (_, index) => ({
    column: (index % FREE_LAYOUT_SIZE) + 1,
    row: Math.floor(index / FREE_LAYOUT_SIZE) + 1,
    columnSpan: 1,
    rowSpan: 1,
  }));
}

export function countAvailableFreeUnitRects(rects: FreeRect[]): number {
  const occupied = rects.map(createFreeRect);
  let count = 0;

  for (let row = 1; row <= FREE_LAYOUT_SIZE; row += 1) {
    for (let column = 1; column <= FREE_LAYOUT_SIZE; column += 1) {
      const candidate = createFreeRect({
        column,
        row,
        columnSpan: 1,
        rowSpan: 1,
      });

      if (occupied.every((rect) => !freeRectsOverlap(candidate, rect))) {
        count += 1;
      }
    }
  }

  return count;
}
