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
export const DESKTOP_FIXED_GRID_MAX = 16;
export const MOBILE_FIXED_GRID_MAX = 3;
const DEFAULT_FREE_RECT_SPAN = 4;

function isDefaultMobileFixedGrid({
  fixedGrid,
  visibleCells,
}: {
  fixedGrid: FixedGrid;
  visibleCells: number;
}) {
  return (
    fixedGrid.columns === DEFAULT_FIXED_GRID.columns &&
    fixedGrid.rows === DEFAULT_FIXED_GRID.rows &&
    visibleCells === DEFAULT_FIXED_GRID.columns * DEFAULT_FIXED_GRID.rows
  );
}

export function createFixedGrid(
  columns: number,
  rows: number,
  options: { max?: number } = {},
): FixedGrid {
  const max = options.max ?? DESKTOP_FIXED_GRID_MAX;

  if (!Number.isInteger(columns) || columns < 1 || columns > max) {
    throw new Error(`Grid columns must be 1-${max}`);
  }

  if (!Number.isInteger(rows) || rows < 1 || rows > max) {
    throw new Error(`Grid rows must be 1-${max}`);
  }

  return { columns, rows };
}

export function fixedGridRangeToastMessage(max: number) {
  return max === MOBILE_FIXED_GRID_MAX
    ? "Grid range is 1-3 on mobile"
    : "Grid range is 1-16 on desktop";
}

export function mobileFixedGridDisplay({
  fixedGrid,
  visibleCells,
}: {
  fixedGrid: FixedGrid;
  visibleCells: number;
}) {
  if (isDefaultMobileFixedGrid({ fixedGrid, visibleCells })) {
    return { columns: 1, rows: 2, visibleCells };
  }

  const mobileVisibleCells = Math.min(
    Math.max(0, visibleCells),
    MOBILE_FIXED_GRID_MAX * MOBILE_FIXED_GRID_MAX,
  );
  const columns =
    mobileVisibleCells <= MOBILE_FIXED_GRID_MAX
      ? 1
      : mobileVisibleCells <= MOBILE_FIXED_GRID_MAX * 2
        ? 2
        : MOBILE_FIXED_GRID_MAX;
  const rows = Math.max(
    1,
    Math.min(
      MOBILE_FIXED_GRID_MAX,
      Math.ceil(mobileVisibleCells / columns) || 1,
    ),
  );

  return {
    columns,
    rows,
    visibleCells: Math.min(mobileVisibleCells, columns * rows),
  };
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
