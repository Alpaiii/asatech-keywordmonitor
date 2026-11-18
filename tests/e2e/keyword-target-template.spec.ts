import { expect, test } from "@playwright/test";

test("pengguna terautentikasi dapat mengunduh template Excel target", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const email = `template-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Target keyword" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Unduh template Excel" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(
    "keywordscope-template-target-keyword.xlsx",
  );
  await download.saveAs(testInfo.outputPath(download.suggestedFilename()));
  expect(await download.failure()).toBeNull();
});

test("template Excel menolak pengguna tanpa session", async ({ request }) => {
  const response = await request.get(
    "/api/v1/imports/keyword-targets/template",
  );

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "UNAUTHENTICATED" },
  });
});
