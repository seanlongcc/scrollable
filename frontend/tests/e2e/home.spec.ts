import { expect, test, type Page } from "@playwright/test";

test("home renders multi-view wall without media previews", async ({
  page,
}, testInfo) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("hydrated but some attributes")
    ) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "scrollable.app" }),
  ).toBeVisible();
  await openWorkbenchOnMobile(page, testInfo.project.name);
  const workbench = workbenchScope(page, testInfo.project.name);
  await expect(workbench.getByLabel("Columns")).toHaveValue("2");
  await expect(workbench.getByLabel("Rows")).toHaveValue("1");
  await expect(workbench.getByLabel("Global timer seconds")).toHaveValue("10");
  await expect(
    workbench.getByRole("button", { name: "Global next" }),
  ).toBeVisible();
  await expect(
    workbench.getByRole("button", { name: "Save layout" }),
  ).toBeVisible();
  await closeWorkbenchOnMobile(page, testInfo.project.name);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Library" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add source", exact: true }),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);

  await page.getByRole("button", { name: "Library" }).click();
  await expect(page.getByRole("dialog", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Account library" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reddit" })).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
});

test("keeps multi-layer workbench within the viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await openWorkbenchOnMobile(page, testInfo.project.name);

  await expect(
    workbenchScope(page, testInfo.project.name).getByRole("button", {
      name: "Select Layer 2",
    }),
  ).toBeVisible();

  const metrics = await page.evaluate(() => {
    const main = document.querySelector("main");
    const sourceArea = main?.querySelector("section > div");

    if (!(main instanceof HTMLElement)) {
      throw new Error("Missing workbench main");
    }
    if (!(sourceArea instanceof HTMLElement)) {
      throw new Error("Missing workbench source area");
    }

    return {
      documentClientHeight: document.documentElement.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      mainClientHeight: main.clientHeight,
      mainScrollHeight: main.scrollHeight,
      sourceAreaClientHeight: sourceArea.clientHeight,
      sourceAreaScrollHeight: sourceArea.scrollHeight,
      sourceAreaBottom: sourceArea.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(metrics.documentScrollHeight).toBeLessThanOrEqual(
    metrics.documentClientHeight + 1,
  );
  expect(metrics.mainScrollHeight).toBeLessThanOrEqual(
    metrics.mainClientHeight + 1,
  );
  expect(metrics.sourceAreaScrollHeight).toBeLessThanOrEqual(
    metrics.sourceAreaClientHeight + 1,
  );
  expect(metrics.sourceAreaBottom).toBeLessThanOrEqual(
    metrics.viewportHeight + 1,
  );
});

test("local upload layouts restore cached files after refresh", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByRole("button", { name: "Local" }).click();
  await page
    .getByLabel("Image/video files")
    .setInputFiles("tests/fixtures/test.webp");
  await expect(page.getByAltText("test.webp")).toBeVisible();

  await openWorkbenchOnMobile(page, testInfo.project.name);
  await page.getByRole("button", { name: "Save layout" }).click();
  await page.getByRole("button", { name: "Save as layout" }).click();

  await page.reload();

  if (testInfo.project.name !== "mobile") {
    await expect(
      page.getByRole("button", { name: "Untitled layout", exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText("No runtime media")).toHaveCount(0);
  await expect(page.getByAltText("test.webp")).toBeVisible();
  await expect(page.getByText("Local files need reload")).toHaveCount(0);
  await expect(page.getByText("No runtime media")).toHaveCount(0);
});

test("free layout templates reopen as empty boxes", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Free layout template editing is desktop-only.",
  );

  await page.goto("/");

  await page.getByRole("button", { name: "Free layout mode" }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByRole("button", { name: "Local" }).click();
  await page
    .getByLabel("Image/video files")
    .setInputFiles("tests/fixtures/test.webp");
  await expect(page.getByAltText("test.webp")).toBeVisible();

  await page.getByRole("button", { name: "Save layout" }).click();
  await page.getByRole("tab", { name: "Template" }).click();
  await page.getByRole("button", { name: "Save as template" }).click();
  await page.getByRole("button", { name: "New layout" }).click();

  await page.getByRole("button", { name: "Library" }).click();
  const dialog = page.getByRole("dialog", { name: "Library" });
  await dialog.getByRole("tab", { name: "Templates" }).click();
  await dialog
    .getByRole("checkbox", { name: "Select Untitled layout" })
    .click();
  await dialog.getByRole("button", { name: "Open selected templates" }).click();

  await expect(
    page.getByRole("button", { name: "Add source to template box" }),
  ).toBeVisible();
  await expect(page.getByAltText("test.webp")).toHaveCount(0);
});

test("warns before displaying provider page embeds", async ({ page }) => {
  await page.route("**/api/url/resolve?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        resolution: {
          status: "resolved",
          mode: "provider",
          hint: "provider:hitomi",
          provider: "hitomi",
          title: "Hitomi",
          externalUrl: "https://hitomi.la/cg/sample-123.html",
          iframeUrl: "https://hitomi.la/cg/sample-123.html",
        },
        nextResolverHint: "provider:hitomi",
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page
    .getByRole("textbox", { name: "URL" })
    .fill("https://hitomi.la/cg/sample-123.html");
  await page.getByRole("button", { name: "Open URL" }).click();

  await expect(page.getByText("Site not natively supported")).toBeVisible();
  await expect(page.locator("iframe[title='Hitomi']")).toHaveCount(0);

  await page.getByRole("button", { name: "Display site" }).click();
  await expect(page.locator("iframe[title='Hitomi']")).toHaveAttribute(
    "src",
    "https://hitomi.la/cg/sample-123.html",
  );
});

test("keyboard and wheel move through runtime feed items", async ({ page }) => {
  await page.route("**/api/reddit/listing?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "runtime-1",
            source: "reddit",
            title: "Runtime image 1",
            subreddit: "pics",
            isNsfw: false,
            createdAt: "2026-04-24T00:00:00.000Z",
            media: [
              {
                type: "image",
                url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
              },
            ],
          },
          {
            id: "runtime-2",
            source: "reddit",
            title: "Runtime image 2",
            subreddit: "pics",
            isNsfw: false,
            createdAt: "2026-04-24T00:00:00.000Z",
            media: [
              {
                type: "image",
                url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
              },
            ],
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByRole("button", { name: "Reddit" }).click();
  await page.getByRole("button", { name: "Use Reddit links" }).click();
  await page
    .getByLabel("Paste Reddit post or subreddit links, one per line")
    .fill("https://www.reddit.com/r/pics/comments/abc123/runtime_image/");
  await page.getByRole("button", { name: "Open Reddit links" }).click();

  await expect(page.getByText("Runtime image 1")).toBeVisible();

  const runtimePane = page.locator("article").filter({
    hasText: "Runtime image 1",
  });
  await runtimePane.click();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByText("Runtime image 2")).toBeVisible();

  await page.keyboard.press("ArrowUp");
  await expect(page.getByText("Runtime image 1")).toBeVisible();

  await runtimePane.hover();
  await page.mouse.wheel(0, 500);
  await expect(page.getByText("Runtime image 2")).toBeVisible();

  await page.mouse.wheel(0, -500);
  await expect(page.getByText("Runtime image 1")).toBeVisible();
});

async function openWorkbenchOnMobile(page: Page, projectName: string) {
  if (projectName !== "mobile") return;
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Workbench" })).toBeVisible();
}

async function closeWorkbenchOnMobile(page: Page, projectName: string) {
  if (projectName !== "mobile") return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Workbench" })).toHaveCount(0);
}

function workbenchScope(page: Page, projectName: string) {
  return projectName === "mobile"
    ? page.getByRole("dialog", { name: "Workbench" })
    : page.getByLabel("Workbench contextual panel");
}
