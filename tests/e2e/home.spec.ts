import { expect, test } from "@playwright/test";

test("home renders multi-view wall without media previews", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Multi-view wall" })).toBeVisible();
  await expect(page.getByLabel("Fixed columns")).toHaveValue("2");
  await expect(page.getByLabel("Fixed rows")).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Master next" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add source", exact: true }),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);
});

test("library page shows metadata-only setup state", async ({ page }) => {
  await page.goto("/library");

  await expect(
    page.getByText(/Supabase env missing|Sign in/i).first(),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);
});
