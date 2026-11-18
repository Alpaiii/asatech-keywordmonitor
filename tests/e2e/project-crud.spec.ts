import { expect, test } from "@playwright/test";

test("project create, read, update, dan archive", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const projectName = `Project E2E ${Date.now()}`;
  const updatedName = `${projectName} Updated`;
  const domain = `e2e-${crypto.randomUUID()}.example.test`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.waitForTimeout(2000); // wait for hydration
  await expect(
    page.getByRole("button", { name: "Daftar lokal" }),
  ).not.toBeDisabled({ timeout: 15000 });
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Project workspace" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Tambah project" }).click();
  await page.getByLabel("Nama project").fill(projectName);
  await page.getByLabel("URL website").fill(`https://${domain}`);
  await page.getByLabel("Negara").selectOption("ID");
  await page.getByLabel("Bahasa").selectOption("id");
  await page.getByLabel("Zona waktu").selectOption("Asia/Jakarta");
  await page.getByRole("button", { name: "Simpan project" }).click();
  await page.getByRole("link", { name: new RegExp(projectName) }).click();

  await page.getByRole("link", { name: new RegExp(projectName) }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText(domain)).toBeVisible();

  await page.locator('input[name="name"]:visible').fill(updatedName);
  await page.getByRole("button", { name: "Simpan perubahan" }).click();

  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByText("Perubahan project tersimpan.")).toBeVisible();
  await expect(page.getByRole("heading", { name: updatedName })).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Arsipkan project" }),
  ).toBeVisible();
  // Submit the archive form directly to avoid form confusion
  await page
    .locator('form:has(button:has-text("Arsipkan project"))')
    .evaluate((form: HTMLFormElement) => form.submit());

  await expect(page).toHaveURL(/archived=1/);
  await expect(page.getByText("Project berhasil diarsipkan.")).toBeVisible();
  await expect(page.getByText(updatedName)).not.toBeVisible();

  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);
});
