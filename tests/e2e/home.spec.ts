import { expect, test } from "@playwright/test";

test("home renders feed console without media previews", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Feed console" })).toBeVisible();
  await expect(page.getByLabel("Subreddit")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.getByText("Feed grid")).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);
});

test("library page shows metadata-only setup state", async ({ page }) => {
  await page.goto("/library");

  await expect(
    page.getByText(/Supabase env missing|Sign in/i).first(),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);
});
