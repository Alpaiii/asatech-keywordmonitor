import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildKeywordTargetTemplate } from "./keyword-target-template";
import { parseKeywordTargetWorkbook } from "./parse-workbook";

async function workbookWithRows(rows: ExcelJS.CellValue[][]) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (await buildKeywordTargetTemplate()) as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0],
  );
  const sheet = workbook.getWorksheet("keyword_targets")!;
  rows.forEach((row, index) => {
    sheet.getRow(index + 2).values = row;
  });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("parseKeywordTargetWorkbook", () => {
  it("menghasilkan validasi per baris", async () => {
    const rows = await parseKeywordTargetWorkbook(
      await workbookWithRows([
        [
          crypto.randomUUID(),
          "jasa seo",
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
        ],
        [
          "invalid",
          "",
          "id",
          "",
          "watch",
          "",
          101,
          "x",
          "",
          "true",
          "",
          0,
          "x",
        ],
      ]),
    );

    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.data?.keyword).toBe("jasa seo");
    expect(rows[1]?.errors.length).toBeGreaterThan(1);
  });

  it("menolak header yang berubah", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("keyword_targets");
    sheet.addRow(["wrong"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

    await expect(parseKeywordTargetWorkbook(bytes)).rejects.toThrow(
      "Header template keyword_targets tidak valid.",
    );
  });
});
