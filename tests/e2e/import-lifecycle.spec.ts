import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

async function signup(page: Page, label: string) {
  const email = `${label}-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  const response = await page.request.get("/api/v1/workspaces");
  return (await response.json()).data[0].id as string;
}

async function keywordWorkbook(projectId: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("keyword_targets");
  sheet.addRow([
    "project_id",
    "keyword",
    "country_code",
    "language_code",
    "device",
    "location",
    "target_position",
    "priority",
    "deadline",
    "maintain_enabled",
    "maintain_position_limit",
    "check_frequency_days",
    "assignee_user_id",
  ]);
  sheet.addRow([
    projectId,
    "import valid",
    "ID",
    "id",
    "desktop",
    "",
    10,
    "high",
    "",
    "false",
    "",
    14,
    "",
  ]);
  sheet.addRow([
    projectId,
    "",
    "ID",
    "id",
    "desktop",
    "",
    101,
    "wrong",
    "",
    "true",
    "",
    0,
    "",
  ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("import target preview, partial commit, idempotency, dan cross-workspace", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const workspaceA = await signup(pageA, "import-a");
  const projectResponse = await pageA.request.post("/api/v1/projects", {
    data: {
      workspaceId: workspaceA,
      name: "Import Project",
      siteUrl: `https://import-${crypto.randomUUID()}.example.test`,
      defaultCountry: "ID",
      defaultLanguage: "id",
      timezone: "Asia/Jakarta",
    },
  });
  const projectId = (await projectResponse.json()).data.id as string;
  const file = await keywordWorkbook(projectId);
  const key = `import-${crypto.randomUUID()}`;

  const preview = await pageA.request.post("/api/v1/imports/keyword-targets", {
    headers: { "Idempotency-Key": key },
    multipart: {
      workspaceId: workspaceA,
      file: {
        name: "targets.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: file,
      },
    },
  });
  expect(preview.status()).toBe(201);
  const previewData = (await preview.json()).data;
  expect(previewData).toMatchObject({
    status: "previewed",
    total_rows: 2,
    valid_rows: 1,
    invalid_rows: 1,
  });
  expect(previewData.rows.map((row: { status: string }) => row.status)).toEqual(
    ["valid", "invalid"],
  );

  const replay = await pageA.request.post("/api/v1/imports/keyword-targets", {
    headers: { "Idempotency-Key": key },
    multipart: {
      workspaceId: workspaceA,
      file: {
        name: "targets.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: file,
      },
    },
  });
  expect((await replay.json()).data.id).toBe(previewData.id);

  const commit = await pageA.request.post("/api/v1/imports/keyword-targets", {
    data: { importId: previewData.id },
  });
  const committed = (await commit.json()).data;
  expect(committed).toMatchObject({
    status: "completed_with_errors",
    succeeded_rows: 1,
    failed_rows: 0,
  });
  expect(committed.rows.map((row: { status: string }) => row.status)).toEqual([
    "succeeded",
    "invalid",
  ]);
  const secondCommit = await pageA.request.post(
    "/api/v1/imports/keyword-targets",
    { data: { importId: previewData.id } },
  );
  expect((await secondCommit.json()).data.succeeded_rows).toBe(1);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signup(pageB, "import-b");
  const hidden = await pageB.request.get(`/api/v1/imports/${previewData.id}`);
  expect(hidden.status()).toBe(404);
  await contextA.close();
  await contextB.close();
});

test("import menolak file non-xlsx", async ({ page }) => {
  const workspaceId = await signup(page, "import-invalid");
  const response = await page.request.post("/api/v1/imports/keyword-targets", {
    headers: { "Idempotency-Key": `invalid-${crypto.randomUUID()}` },
    multipart: {
      workspaceId,
      file: {
        name: "targets.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("invalid"),
      },
    },
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "INVALID_INPUT" },
  });
});
