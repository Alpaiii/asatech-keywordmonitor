import { expect, test } from "@playwright/test";

test("check-in manual tersimpan sebagai riwayat immutable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = `checkin-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const projectName = `Checkin Project ${Date.now()}`;
  const phrase = `Keyword Checkin ${Date.now()}`;
  const domain = `checkin-${crypto.randomUUID()}.example.test`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.waitForTimeout(1000); // wait for hydration
  await expect(
    page.getByRole("button", { name: "Daftar lokal" }),
  ).not.toBeDisabled({ timeout: 10000 });
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
  await expect(page).toHaveURL(/\/dashboard\/keywords\//, { timeout: 30_000 });

  await expect(
    page.getByText("Belum ada data", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText("rank-status-v1", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada check-in. Status posisi tetap no_data.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("rank-trend-empty")).toContainText(
    "Belum ada data untuk trend posisi.",
  );
  await page.getByLabel("Posisi manual").fill("8");
  await page.getByLabel("Catatan").fill("Observasi manual pertama.");
  await page.getByRole("button", { name: "Simpan check-in" }).click();
  await expect(page).toHaveURL(/checkin=1/, { timeout: 30_000 });
  await expect(
    page.getByText("Check-in manual tersimpan sebagai riwayat baru."),
  ).toBeVisible();
  await expect(page.getByText("Posisi 8", { exact: true })).toBeVisible();
  await expect(page.getByText("manual", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Target tercapai", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Posisi terbaru 8 mencapai target/).first(),
  ).toBeVisible();
  await expect(page.getByTestId("rank-trend-chart")).toBeVisible();
  await expect(page.getByText("Sumber: Manual", { exact: true })).toBeVisible();

  await page.getByLabel("Tidak ditemukan di top 100").check();
  await page.getByLabel("Catatan").fill("Tidak terlihat sampai hasil ke-100.");
  await page.getByRole("button", { name: "Simpan check-in" }).click();
  await expect(page.getByText("Berisiko", { exact: true }).first()).toBeVisible(
    { timeout: 30_000 },
  );
  await expect(
    page.getByText("Tidak ditemukan di top 100", { exact: true }).last(),
  ).toBeVisible();
  await expect(page.getByText("Posisi 8", { exact: true })).toBeVisible();
  await expect(page.getByText("manual", { exact: true })).toHaveCount(2);
  await expect(
    page.getByText(/Nilai ini membuat gap; bukan posisi 100 atau 101/),
  ).toBeVisible();
  await expect(page.getByText(/memburuk/).first()).toBeVisible();
  await page.getByText(/Riwayat status \(3\)/).click();
  await expect(page.getByText("Belum ada data", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Target tercapai", { exact: true }),
  ).toBeVisible();
  const historyRows = page.getByTestId("rank-history").locator(":scope > li");
  await expect(historyRows.first()).toContainText("Tidak ditemukan di top 100");
  await expect(historyRows.nth(1)).toContainText("Posisi 8");
});
