import { expect, test } from "@playwright/test";

test("home renders multi-view wall without media previews", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "scrollable.app" }),
  ).toBeVisible();
  await expect(page.getByLabel("Fixed columns")).toHaveValue("2");
  await expect(page.getByLabel("Fixed rows")).toHaveValue("1");
  await expect(page.getByLabel("Global timer seconds")).toHaveValue("10");
  await expect(page.getByRole("button", { name: "Global next" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open layouts" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save layout" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add source", exact: true }),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);

  await page.getByRole("button", { name: "Open layouts" }).click();
  await expect(
    page.getByRole("dialog", { name: "Saved layouts" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Account library" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reddit" })).toHaveCount(0);
});
