import { expect, test } from "@playwright/test";

test("session kedaluwarsa ditolak dari protected route", async ({ page }) => {
  const email = `expired-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  const authCookies = (await page.context().cookies()).filter((cookie) =>
    cookie.name.startsWith("sb-"),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  await page.context().addCookies(
    authCookies.map((cookie) => ({
      ...cookie,
      expires: Math.floor(Date.now() / 1000) - 60,
    })),
  );

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
