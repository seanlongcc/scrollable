import { expect, test, type Page } from "@playwright/test";

const MIN_TOUCH_TARGET_PX = 44;

type TargetViolation = {
  label: string;
  tag: string;
  width: number;
  height: number;
};

test("mobile primary controls meet minimum touch target size", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only touch audit.");

  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "scrollable.app" }),
  ).toBeVisible();
  expect(await collectTouchTargetViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add source" })).toBeVisible();
  expect(await collectTouchTargetViolations(page)).toEqual([]);
});

async function collectTouchTargetViolations(
  page: Page,
): Promise<TargetViolation[]> {
  return page.evaluate((minTouchTargetPx) => {
    const selector = [
      "a[href]",
      "button",
      "input",
      "textarea",
      "select",
      '[role="button"]',
      '[role="tab"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    function isVisibleTarget(element: Element, rect: DOMRect) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      if (rect.width <= 1 || rect.height <= 1) return false;
      if (rect.bottom <= 0 || rect.right <= 0) return false;
      if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
        return false;
      }
      return true;
    }

    function labelFor(element: Element) {
      return (
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.textContent?.trim().replace(/\s+/g, " ") ||
        element.getAttribute("placeholder") ||
        element.tagName.toLowerCase()
      );
    }

    return Array.from(document.querySelectorAll(selector))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (!isVisibleTarget(element, rect)) return [];
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (width >= minTouchTargetPx && height >= minTouchTargetPx) return [];

        return [
          {
            label: labelFor(element),
            tag: element.tagName.toLowerCase(),
            width,
            height,
          },
        ];
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, MIN_TOUCH_TARGET_PX);
}
