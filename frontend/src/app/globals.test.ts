import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "globals.css");

function readGlobalsCss() {
  return readFileSync(cssPath, "utf8");
}

function mobileCss(css: string) {
  const mediaStart = css.indexOf("@media (max-width: 767px)");
  expect(mediaStart).toBeGreaterThanOrEqual(0);
  return css.slice(mediaStart);
}

describe("global mobile form control styles", () => {
  it("keeps text form controls at 16px on mobile to avoid iOS focus zoom", () => {
    expect(mobileCss(readGlobalsCss())).toMatch(
      /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\),\s*textarea,\s*select\s*\{[^}]*font-size:\s*1rem;/,
    );
  });

  it("does not shrink compact mobile inputs below the iOS focus threshold", () => {
    expect(mobileCss(readGlobalsCss())).not.toMatch(
      /\.mobile-compact-controls \[data-slot="input"\][^{]*\{[^}]*font-size:\s*0\.78rem;/,
    );
  });
});
