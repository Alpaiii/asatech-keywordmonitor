import { expect, test } from "@playwright/test";

async function signup(page: import("@playwright/test").Page) {
  const email = `api-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Daftar lokal" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

test("kontrak API workspace dan project", async ({ page }) => {
  test.setTimeout(90_000);
  await signup(page);

  const workspaces = await page.evaluate(async () => {
    const response = await fetch("/api/v1/workspaces", {
      headers: { "x-request-id": "contract-workspaces" },
    });
    return {
      body: await response.json(),
      requestId: response.headers.get("x-request-id"),
      status: response.status,
    };
  });

  expect(workspaces.status).toBe(200);
  expect(workspaces.requestId).toBe("contract-workspaces");
  expect(workspaces.body.data).toHaveLength(1);
  const workspaceId = workspaces.body.data[0].id as string;

  const invalid = await page.evaluate(async () => {
    const response = await fetch("/api/v1/projects?workspaceId=invalid");
    return { body: await response.json(), status: response.status };
  });
  expect(invalid.status).toBe(400);
  expect(invalid.body.error.code).toBe("INVALID_INPUT");
  expect(invalid.body.error.requestId).toEqual(expect.any(String));

  const domain = `api-${crypto.randomUUID()}.example.test`;
  const projectBody = {
    workspaceId,
    name: "Project API Contract",
    siteUrl: `https://${domain}`,
    defaultCountry: "ID",
    defaultLanguage: "id",
    timezone: "Asia/Jakarta",
  };
  const created = await page.evaluate(async (body) => {
    const response = await fetch("/api/v1/projects", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return { body: await response.json(), status: response.status };
  }, projectBody);

  expect(created.status).toBe(201);
  expect(created.body.data.domain).toBe(domain);
  const projectId = created.body.data.id as string;

  const duplicate = await page.evaluate(async (body) => {
    const response = await fetch("/api/v1/projects", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return { body: await response.json(), status: response.status };
  }, projectBody);
  expect(duplicate.status).toBe(409);
  expect(duplicate.body.error.code).toBe("CONFLICT");

  const detail = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/projects/${id}`);
    return { body: await response.json(), status: response.status };
  }, projectId);
  expect(detail.status).toBe(200);
  expect(detail.body.data.id).toBe(projectId);

  const hidden = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/projects/${id}`);
    return { body: await response.json(), status: response.status };
  }, crypto.randomUUID());
  expect(hidden.status).toBe(404);
  expect(hidden.body.error.code).toBe("NOT_FOUND");
});

test("API tanpa session memakai kontrak 401", async ({ request }) => {
  const response = await request.get("/api/v1/workspaces");
  expect(response.status()).toBe(401);
  expect(response.headers()["x-request-id"]).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: "UNAUTHENTICATED",
      message: "Session pengguna wajib.",
    },
  });
});
