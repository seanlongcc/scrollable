import "@testing-library/jest-dom/vitest";

globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
