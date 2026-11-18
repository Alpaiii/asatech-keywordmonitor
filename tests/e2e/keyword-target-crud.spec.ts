import { expect, test } from "@playwright/test";

test("target keyword create, read, update, dan delete", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `keyword-crud-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const projectName = `Keyword Project ${Date.now()}`;
  const domain = `keyword-crud-${crypto.randomUUID()}.example.test`;
  const phrase = `Jasa SEO ${Date.now()}`;
  const updatedPhrase = `${phrase} Jakarta`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Tambah project" }).click();
  await page.getByLabel("Nama project").fill(projectName);
  await page.getByLabel("URL website").fill(`https://${domain}`);
  await page.getByRole("button", { name: "Simpan project" }).click();
  await page.getByRole("link", { name: new RegExp(projectName) }).click();
  await page.getByRole("link", { name: "Kelola target keyword" }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/keywords$/);

  await expect(page.getByText("Belum ada target keyword")).toBeVisible();
  await page.getByRole("link", { name: "Tambah target" }).click();
  await page
    .getByRole("textbox", { name: "Keyword", exact: true })
    .fill(phrase);
  await page.getByLabel("Device").selectOption("mobile");
  await page.getByLabel("Lokasi").fill("Jakarta");
  await page.getByLabel("Target posisi").fill("5");
  await page.getByLabel("Prioritas").selectOption("high");
  await page.getByLabel("Frekuensi check-in (hari)").fill("7");
  await page.getByRole("button", { name: "Simpan target" }).click();

  await expect(page).toHaveURL(/\/keywords\?created=1/, { timeout: 30_000 });
  await expect(page.getByText("Target keyword berhasil dibuat.")).toBeVisible();
  await page.getByRole("link", { name: new RegExp(phrase) }).click();
  await expect(page.getByRole("heading", { name: phrase })).toBeVisible();

  await page.locator('input[name="phrase"]:visible').fill(updatedPhrase);
  await page.locator('input[name="maintainEnabled"]:visible').check();
  await page.locator('input[name="maintainPositionLimit"]:visible').fill("10");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 30_000 });
  await expect(page.getByText("Perubahan target tersimpan.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: updatedPhrase }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Target keyword" }).click();
  await expect(
    page.getByRole("heading", { name: "Semua target keyword" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Project").selectOption({ label: projectName });
  await page.locator('select[name="pic"]').selectOption("unassigned");
  await page
    .locator('form[method="get"] select[name="priority"]')
    .selectOption("high");
  await page.locator('select[name="status"]').selectOption("no_data");
  await page.locator('select[name="maintain"]').selectOption("enabled");
  await page.getByRole("button", { name: "Terapkan filter" }).click();
  await expect(page).toHaveURL(/priority=high/);
  await expect(page.getByTestId("filtered-targets")).toContainText(
    updatedPhrase,
  );
  await expect(page.getByTestId("filtered-targets")).toContainText(
    "Belum ada data",
  );
  await page.getByLabel(`Pilih ${updatedPhrase}`).check();
  await page.getByLabel("Prioritas baru").selectOption("critical");
  await page.getByRole("button", { name: "Terapkan ke 1 target" }).click();
  await expect(page.getByText("Tidak ada target yang cocok")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("link", { name: "Reset filter" }).click();
  await expect(page.getByTestId("filtered-targets")).toContainText("critical");
  await page.getByRole("link", { name: new RegExp(updatedPhrase) }).click();

  await page.getByRole("button", { name: "Hapus target" }).click();
  await expect(page).toHaveURL(/\/keywords\?deleted=1/, { timeout: 30_000 });
  await expect(
    page.getByText("Target keyword berhasil dihapus."),
  ).toBeVisible();
  await expect(page.getByText("Belum ada target keyword")).toBeVisible();
});
