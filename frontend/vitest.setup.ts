import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

function installResponsiveStyle() {
  if (document.getElementById("vitest-responsive-style")) return;

  const responsiveStyle = document.createElement("style");
  responsiveStyle.id = "vitest-responsive-style";
  responsiveStyle.textContent = `
    .hidden { display: none !important; }
    .md\\:block { display: block !important; }
    .md\\:flex { display: flex !important; }
    .md\\:grid { display: grid !important; }
    .md\\:inline-flex { display: inline-flex !important; }
    .md\\:hidden { display: none !important; }
  `;
  document.head.appendChild(responsiveStyle);
}

installResponsiveStyle();
beforeEach(installResponsiveStyle);

HTMLElement.prototype.scrollIntoView =
  HTMLElement.prototype.scrollIntoView ?? (() => undefined);

HTMLElement.prototype.scrollBy =
  HTMLElement.prototype.scrollBy ?? (() => undefined);

globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
