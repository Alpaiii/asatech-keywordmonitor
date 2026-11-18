import { describe, expect, it } from "vitest";
import { normalizeProjectInput, projectSchema } from "./validation";

const validProject = {
  name: "Toko Contoh",
  siteUrl: "https://www.example.com/",
  defaultCountry: "ID",
  defaultLanguage: "id",
  timezone: "Asia/Jakarta",
};

describe("projectSchema", () => {
  it("menerima project valid", () => {
    expect(projectSchema.safeParse(validProject).success).toBe(true);
  });

  it("menolak protokol selain HTTP", () => {
    expect(
      projectSchema.safeParse({ ...validProject, siteUrl: "ftp://example.com" })
        .success,
    ).toBe(false);
  });

  it("menolak kode negara tidak valid", () => {
    expect(
      projectSchema.safeParse({ ...validProject, defaultCountry: "Indonesia" })
        .success,
    ).toBe(false);
  });
});

describe("normalizeProjectInput", () => {
  it("menormalkan URL dan domain", () => {
    expect(normalizeProjectInput(validProject)).toMatchObject({
      siteUrl: "https://www.example.com",
      domain: "example.com",
    });
  });
});
