import { expect, test } from "@playwright/test";

test("root langsung membuka halaman login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke workspace" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
});
