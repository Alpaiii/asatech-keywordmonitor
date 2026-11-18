import { expect, test } from "@playwright/test";

test("audit dashboard menampilkan item traceable dan filter", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = `audit-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const projectName = `Audit Project ${Date.now()}`;
  const phrase = `Keyword Audit ${Date.now()}`;
  const domain = `audit-${crypto.randomUUID()}.example.test`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Tambah project" }).click();
  await page.getByLabel("Nama project").fill(projectName);
  await page.getByLabel("URL website").fill(`https://${domain}`);
  await page.getByRole("button", { name: "Simpan project" }).click();
  const projectHref = await page
    .getByRole("link", { name: new RegExp(projectName) })
    .getAttribute("href");
  expect(projectHref).toBeTruthy();
  await page.goto(projectHref!);
  await page.getByRole("link", { name: "Kelola target keyword" }).click();
  await page.getByRole("link", { name: "Tambah target" }).click();
  await page
    .getByRole("textbox", { name: "Keyword", exact: true })
    .fill(phrase);
  await page.getByLabel("PIC").selectOption("");
  await page.getByRole("button", { name: "Simpan target" }).click();
  await expect(page).toHaveURL(/\/keywords\?created=1/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Kembali ke detail project" }).click();
  await page.getByRole("link", { name: "Kembali ke project" }).click();
  await page.getByRole("link", { name: "Audit operasional" }).click();

  await expect(
    page.getByRole("heading", { name: "Item perlu tindakan" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  const projectProgress = page.getByTestId("project-progress");
  await expect(projectProgress).toContainText(projectName);
  await expect(projectProgress).toContainText("0%");
  await expect(projectProgress).toContainText("0 dari 1 target tercapai");
  await expect(projectProgress).toContainText("1 target perlu tindakan");
  await expect(
    page.getByText("Belum ada target yang ditugaskan ke PIC."),
  ).toBeVisible();
  await expect(page.getByText("1 target belum memiliki PIC")).toBeVisible();

  const auditItems = page.getByTestId("audit-items");
  await expect(auditItems.getByText(phrase)).toHaveCount(2);
  await expect(
    auditItems.getByText("Belum ada data", { exact: true }),
  ).toBeVisible();
  await expect(
    auditItems.getByText("Tanpa PIC", { exact: true }),
  ).toBeVisible();
  await expect(auditItems.getByText("rank-status-v1")).toHaveCount(2);
  await expect(auditItems.getByText("tidak ada")).toHaveCount(2);

  await page.getByLabel("Kategori").selectOption("no_pic");
  await page.getByRole("button", { name: "Terapkan filter" }).click();
  await expect(auditItems.getByText(phrase)).toHaveCount(1);
  await expect(
    auditItems.getByText("Tanpa PIC", { exact: true }),
  ).toBeVisible();
  await expect(
    auditItems.getByText("Belum ada data", { exact: true }),
  ).toHaveCount(0);
});
