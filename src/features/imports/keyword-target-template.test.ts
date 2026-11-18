import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildKeywordTargetTemplate,
  KEYWORD_TARGET_TEMPLATE_COLUMNS,
} from "./keyword-target-template";

describe("buildKeywordTargetTemplate", () => {
  it("membuat workbook input kosong, petunjuk, dan contoh demo terpisah", async () => {
    const workbook = new ExcelJS.Workbook();
    const template = await buildKeywordTargetTemplate();
    await workbook.xlsx.load(
      template as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "keyword_targets",
      "petunjuk",
      "contoh_demo_jangan_import",
    ]);

    const input = workbook.getWorksheet("keyword_targets");
    expect(input?.getRow(1).values).toEqual([
      undefined,
      ...KEYWORD_TARGET_TEMPLATE_COLUMNS,
    ]);
    expect(input?.actualRowCount).toBe(1);
    expect(input?.getCell("E2").dataValidation.formulae).toEqual([
      '"desktop,mobile,tablet"',
    ]);
    expect(input?.getCell("H2").dataValidation.formulae).toEqual([
      '"low,medium,high,critical"',
    ]);

    const example = workbook.getWorksheet("contoh_demo_jangan_import");
    expect(example?.getCell("B2").value).toBe("contoh keyword demo");
  });
});
