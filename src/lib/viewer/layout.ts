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
export const FREE_LAYOUT_SIZE = 8;

export function createFixedGrid(columns: number, rows: number): FixedGrid {
  if (!Number.isInteger(columns) || columns < 1 || columns > 8) {
    throw new Error("Grid columns must be 1-8");
  }

  if (!Number.isInteger(rows) || rows < 1 || rows > 8) {
    throw new Error("Grid rows must be 1-8");
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
    throw new Error("Free layout rectangle must fit inside the 8x8 canvas");
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
    for (let nextIndex = index + 1; nextIndex < validRects.length; nextIndex += 1) {
      if (freeRectsOverlap(validRects[index], validRects[nextIndex])) {
        throw new Error("Free layout views cannot overlap");
      }
    }
  }

  return validRects;
}
