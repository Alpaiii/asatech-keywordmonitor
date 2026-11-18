import ExcelJS from "exceljs";

export const KEYWORD_TARGET_TEMPLATE_FILENAME =
  "keywordscope-template-target-keyword.xlsx";
export const KEYWORD_TARGET_TEMPLATE_COLUMNS = [
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
] as const;

const instructions = [
  ["Kolom", "Wajib", "Format / aturan"],
  ["project_id", "Ya", "UUID project dalam workspace aktif."],
  ["keyword", "Ya", "Teks 1–500 karakter."],
  ["country_code", "Ya", "Kode negara ISO 2 huruf kapital, contoh ID."],
  ["language_code", "Ya", "Kode bahasa, contoh id, en, atau ms."],
  ["device", "Ya", "desktop, mobile, atau tablet."],
  ["location", "Tidak", "Lokasi spesifik, maksimal 200 karakter."],
  ["target_position", "Ya", "Bilangan bulat 1–100."],
  ["priority", "Ya", "low, medium, high, atau critical."],
  ["deadline", "Tidak", "Tanggal YYYY-MM-DD."],
  ["maintain_enabled", "Ya", "true atau false."],
  [
    "maintain_position_limit",
    "Kondisional",
    "Bilangan bulat 1–100; wajib saat maintain_enabled=true.",
  ],
  ["check_frequency_days", "Ya", "Bilangan bulat 1–365."],
  [
    "assignee_user_id",
    "Tidak",
    "UUID anggota workspace yang sama; kosong berarti tanpa PIC.",
  ],
];

const demoRow = [
  "00000000-0000-4000-8000-000000000001",
  "contoh keyword demo",
  "ID",
  "id",
  "desktop",
  "Jakarta",
  10,
  "medium",
  "2026-12-31",
  false,
  "",
  14,
  "",
];

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF000000" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF08A" },
  };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "medium", color: { argb: "FF000000" } },
    };
  });
}

export async function buildKeywordTargetTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KeywordScope";
  workbook.created = new Date(0);
  workbook.modified = new Date(0);

  const input = workbook.addWorksheet("keyword_targets", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  input.addRow([...KEYWORD_TARGET_TEMPLATE_COLUMNS]);
  styleHeader(input.getRow(1));
  input.autoFilter = `A1:M1`;
  input.columns = KEYWORD_TARGET_TEMPLATE_COLUMNS.map((key) => ({
    key,
    width: key === "keyword" || key === "location" ? 28 : 22,
  }));

  for (let row = 2; row <= 1001; row += 1) {
    input.getCell(`E${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"desktop,mobile,tablet"'],
    };
    input.getCell(`H${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"low,medium,high,critical"'],
    };
    input.getCell(`J${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"true,false"'],
    };
    for (const column of ["G", "K"]) {
      input.getCell(`${column}${row}`).dataValidation = {
        type: "whole",
        operator: "between",
        allowBlank: column === "K",
        formulae: [1, 100],
      };
    }
    input.getCell(`L${row}`).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: false,
      formulae: [1, 365],
    };
  }

  const guide = workbook.addWorksheet("petunjuk");
  instructions.forEach((row) => guide.addRow(row));
  styleHeader(guide.getRow(1));
  guide.columns = [{ width: 28 }, { width: 16 }, { width: 72 }];
  guide.insertRow(1, [
    "Isi sheet keyword_targets. Jangan ubah nama sheet atau header. Maksimal 1.000 baris per file.",
  ]);
  guide.mergeCells("A1:C1");
  guide.getCell("A1").font = { bold: true };
  guide.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBFDBFE" },
  };

  const example = workbook.addWorksheet("contoh_demo_jangan_import");
  example.addRow([...KEYWORD_TARGET_TEMPLATE_COLUMNS]);
  example.addRow(demoRow);
  styleHeader(example.getRow(1));
  example.columns = input.columns.map((column) => ({ width: column.width }));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
