import { expect, test, type Page } from "@playwright/test";

const MIN_TOUCH_TARGET_PX = 44;
const MIN_COMPACT_TOUCH_TARGET_PX = 40;

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
    page.getByRole("button", { name: "Add source", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "scrollable.app" })).toHaveCount(
    0,
  );
  expect(await collectTouchTargetViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add source" })).toBeVisible();
  expect(await collectTouchTargetViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  const closeSheet = page.getByRole("button", { name: "Close sheet" });
  await expect(closeSheet).toBeVisible();
  const closeSheetBox = await closeSheet.boundingBox();
  expect(closeSheetBox?.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  expect(closeSheetBox?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  expect(await closeSheetRadius(page)).toBeGreaterThanOrEqual(
    (closeSheetBox?.width ?? 0) / 2,
  );
});

test("mobile omits header and starts the source frame near the top", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout audit.");

  await page.goto("/");

  await expect(page.getByRole("link", { name: "scrollable.app" })).toHaveCount(
    0,
  );
  expect(await sourceFrameTop(page)).toBeLessThanOrEqual(12);
});

test("mobile source info sits on the right of selected sources", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout audit.");

  await page.goto("/");
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByRole("button", { name: "Local" }).click();
  await page
    .getByLabel("Image/video files")
    .setInputFiles("tests/fixtures/test.webp");
  await expect(page.getByAltText("test.webp")).toBeVisible();
  await page.getByRole("button", { name: "Select Local upload" }).click();

  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  const workbenchDialog = page.getByRole("dialog", { name: "Workbench" });
  await expect(workbenchDialog).toBeVisible();
  const sourceInfoButton = workbenchDialog.getByRole("button", {
    name: "Show info",
  });
  await expect(sourceInfoButton).toHaveAttribute("data-variant", "outline");
  await sourceInfoButton.click();
  await expect(
    workbenchDialog.getByRole("button", { name: "Hide info" }),
  ).toHaveAttribute("data-variant", "default");
  await page.getByRole("button", { name: "Close sheet" }).click();
  await expect(workbenchDialog).toBeHidden();
  await expect(page.getByText("Local upload", { exact: true })).toBeVisible();

  const metrics = await sourceInfoAlignment(page);
  expect(metrics.infoRightGap).toBeLessThanOrEqual(16);
  expect(metrics.infoLeftGap).toBeGreaterThanOrEqual(44);
});

async function collectTouchTargetViolations(
  page: Page,
): Promise<TargetViolation[]> {
  return page.evaluate(
    ({ minTouchTargetPx, minCompactTouchTargetPx }) => {
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
        if (element.classList.contains("sr-only")) return false;

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

      function minTargetSize(element: Element) {
        return element.closest(".mobile-compact-controls")
          ? minCompactTouchTargetPx
          : minTouchTargetPx;
      }

      return Array.from(document.querySelectorAll(selector))
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          if (!isVisibleTarget(element, rect)) return [];
          const width = Math.round(rect.width);
          const height = Math.round(rect.height);
          const minTargetPx = minTargetSize(element);
          if (width >= minTargetPx && height >= minTargetPx) return [];

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
    },
    {
      minTouchTargetPx: MIN_TOUCH_TARGET_PX,
      minCompactTouchTargetPx: MIN_COMPACT_TOUCH_TARGET_PX,
    },
  );
}

async function sourceFrameTop(page: Page): Promise<number> {
  return page.evaluate(() => {
    const stageFrame = document.querySelector("main > section > div");

    if (!stageFrame) return -1;

    return Math.round(stageFrame.getBoundingClientRect().top);
  });
}

async function closeSheetRadius(page: Page): Promise<number> {
  return page
    .getByRole("button", { name: "Close sheet" })
    .evaluate((element) => {
      return Number.parseFloat(window.getComputedStyle(element).borderRadius);
    });
}

async function sourceInfoAlignment(page: Page): Promise<{
  infoLeftGap: number;
  infoRightGap: number;
}> {
  return page.evaluate(() => {
    const frame = document.querySelector("main > section > div");
    const infoTitle = document.querySelector('[title="Local upload"]');
    const infoBox = infoTitle?.parentElement;

    if (!frame || !infoBox) {
      throw new Error("Missing source frame or info box");
    }

    const frameRect = frame.getBoundingClientRect();
    const infoRect = infoBox.getBoundingClientRect();

    return {
      infoLeftGap: Math.round(infoRect.left - frameRect.left),
      infoRightGap: Math.round(frameRect.right - infoRect.right),
    };
  });
}
