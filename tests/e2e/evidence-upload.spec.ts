import { expect, test } from "@playwright/test";

const PNG_FIXTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("evidence diunggah privat dan tersedia lewat signed URL", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = `evidence-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const projectName = `Evidence Project ${Date.now()}`;
  const phrase = `Keyword Evidence ${Date.now()}`;
  const domain = `evidence-${crypto.randomUUID()}.example.test`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Tambah project" }).click();
  await page.getByLabel("Nama project").fill(projectName);
  await page.getByLabel("URL website").fill(`https://${domain}`);
  await page.getByRole("button", { name: "Simpan project" }).click();
  await page.getByRole("link", { name: new RegExp(projectName) }).click();
  await page.getByRole("link", { name: "Kelola target keyword" }).click();
  await page.getByRole("link", { name: "Tambah target" }).click();
  await page
    .getByRole("textbox", { name: "Keyword", exact: true })
    .fill(phrase);
  await page.getByRole("button", { name: "Simpan target" }).click();
  await expect(page).toHaveURL(/\/keywords\?created=1/, { timeout: 30_000 });
  await page.getByRole("link", { name: new RegExp(phrase) }).click();

  await page.getByLabel("Posisi manual").fill("9");
  await page.getByRole("button", { name: "Simpan check-in" }).click();
  await expect(page).toHaveURL(/checkin=1/, { timeout: 30_000 });

  await page.getByLabel("Upload evidence").setInputFiles({
    name: "ranking.png",
    mimeType: "image/png",
    buffer: PNG_FIXTURE,
  });
  await page.getByRole("button", { name: "Simpan evidence" }).click();
  await expect(page).toHaveURL(/evidence=1/, { timeout: 30_000 });
  await expect(
    page.getByText("Evidence tersimpan di storage privat."),
  ).toBeVisible();
  await expect(page.getByText(/ranking\.png · image\/png/)).toBeVisible();

  await page.getByRole("button", { name: "Buka 60 detik" }).click();
  await expect(page).toHaveURL(/\/storage\/v1\/object\/sign\/rank-evidence\//, {
    timeout: 30_000,
  });
});
