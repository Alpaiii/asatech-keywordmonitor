import { expect, test } from "@playwright/test";

test("menampilkan status fondasi lokal", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /fondasi lokal sedang disiapkan/i }),
  ).toBeVisible();
  await expect(page.getByText("not_configured")).toBeVisible();
});
