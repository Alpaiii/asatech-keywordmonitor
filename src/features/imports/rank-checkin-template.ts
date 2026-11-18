import ExcelJS from "exceljs";

export const RANK_CHECKIN_TEMPLATE_FILENAME =
  "keywordscope-template-checkin-ranking.xlsx";
export const RANK_CHECKIN_COLUMNS = [
  "keyword_target_id",
  "position",
  "not_found_top_100",
  "checked_at",
  "notes",
] as const;

export async function buildRankCheckinTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KeywordScope";
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  const input = workbook.addWorksheet("rank_checkins", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  input.addRow([...RANK_CHECKIN_COLUMNS]);
  input.getRow(1).font = { bold: true };
  input.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF08A" },
  };
  input.columns = [
    { width: 40 },
    { width: 14 },
    { width: 24 },
    { width: 28 },
    { width: 50 },
  ];
  for (let row = 2; row <= 1001; row += 1) {
    input.getCell(`B${row}`).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [1, 100],
    };
    input.getCell(`C${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"true,false"'],
    };
  }
  const guide = workbook.addWorksheet("petunjuk");
  guide.addRows([
    ["Kolom", "Wajib", "Aturan"],
    ["keyword_target_id", "Ya", "UUID target dalam workspace aktif."],
    ["position", "Kondisional", "1–100; kosong bila not_found_top_100=true."],
    ["not_found_top_100", "Ya", "true atau false."],
    ["checked_at", "Ya", "ISO 8601, tidak boleh masa depan."],
    ["notes", "Tidak", "Maksimal 2.000 karakter."],
  ]);
  guide.getRow(1).font = { bold: true };
  guide.columns = [{ width: 28 }, { width: 18 }, { width: 72 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
