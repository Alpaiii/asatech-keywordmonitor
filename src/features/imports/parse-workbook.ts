import ExcelJS from "exceljs";
import { z } from "zod";
import { KEYWORD_TARGET_TEMPLATE_COLUMNS } from "./keyword-target-template";
import { RANK_CHECKIN_COLUMNS } from "./rank-checkin-template";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

const uuidOrEmpty = z.union([z.literal(""), z.string().uuid()]);
export const keywordRowSchema = z
  .object({
    project_id: z.string().uuid("project_id harus UUID."),
    keyword: z.string().trim().min(1).max(500),
    country_code: z.string().regex(/^[A-Z]{2}$/, "country_code tidak valid."),
    language_code: z
      .string()
      .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, "language_code tidak valid."),
    device: z.enum(["desktop", "mobile", "tablet"]),
    location: z.string().trim().max(200),
    target_position: z.coerce.number().int().min(1).max(100),
    priority: z.enum(["low", "medium", "high", "critical"]),
    deadline: z
      .string()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: "deadline harus YYYY-MM-DD.",
      }),
    maintain_enabled: z.enum(["true", "false"]),
    maintain_position_limit: z.union([
      z.literal(""),
      z.coerce.number().int().min(1).max(100),
    ]),
    check_frequency_days: z.coerce.number().int().min(1).max(365),
    assignee_user_id: uuidOrEmpty,
  })
  .refine(
    (row) =>
      row.maintain_enabled === "false" || row.maintain_position_limit !== "",
    {
      message:
        "maintain_position_limit wajib saat maintain_enabled bernilai true.",
      path: ["maintain_position_limit"],
    },
  );

export type ParsedImportRow<T> = {
  rowNumber: number;
  input: Record<string, string>;
  data?: T;
  errors: string[];
};

export type KeywordImportData = z.infer<typeof keywordRowSchema>;

const rankCheckinRowSchema = z
  .object({
    keyword_target_id: z.string().uuid("keyword_target_id harus UUID."),
    position: z.union([z.literal(""), z.coerce.number().int().min(1).max(100)]),
    not_found_top_100: z.enum(["true", "false"]),
    checked_at: z.string().datetime({ message: "checked_at harus ISO 8601." }),
    notes: z.string().trim().max(2000),
  })
  .refine(
    (row) =>
      (row.position !== "" && row.not_found_top_100 === "false") ||
      (row.position === "" && row.not_found_top_100 === "true"),
    { message: "Isi position atau tandai not_found_top_100=true." },
  )
  .refine((row) => Date.parse(row.checked_at) <= Date.now(), {
    message: "checked_at tidak boleh berada di masa depan.",
    path: ["checked_at"],
  });

export type RankCheckinImportData = z.infer<typeof rankCheckinRowSchema>;

function cellText(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  if (typeof cell.value === "object" && "text" in cell.value) {
    return String(cell.value.text).trim();
  }
  if (typeof cell.value === "object" && "result" in cell.value) {
    return String(cell.value.result ?? "").trim();
  }
  return String(cell.value).trim();
}

function issues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const field = issue.path.join(".");
    return field ? `${field}: ${issue.message}` : issue.message;
  });
}

export async function parseKeywordTargetWorkbook(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheet = workbook.getWorksheet("keyword_targets");
  if (!sheet) throw new Error("Sheet keyword_targets tidak ditemukan.");

  const headers = KEYWORD_TARGET_TEMPLATE_COLUMNS.map((_, index) =>
    cellText(sheet.getCell(1, index + 1)),
  );
  if (headers.join("|") !== KEYWORD_TARGET_TEMPLATE_COLUMNS.join("|")) {
    throw new Error("Header template keyword_targets tidak valid.");
  }

  const rows: ParsedImportRow<KeywordImportData>[] = [];
  const lastRow = sheet.actualRowCount;
  if (Math.max(0, lastRow - 1) > MAX_IMPORT_ROWS) {
    throw new Error(`File melebihi ${MAX_IMPORT_ROWS} baris data.`);
  }

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const input = Object.fromEntries(
      KEYWORD_TARGET_TEMPLATE_COLUMNS.map((header, index) => [
        header,
        cellText(sheet.getCell(rowNumber, index + 1)),
      ]),
    );
    if (Object.values(input).every((value) => value === "")) continue;
    const parsed = keywordRowSchema.safeParse(input);
    rows.push(
      parsed.success
        ? { rowNumber, input, data: parsed.data, errors: [] }
        : { rowNumber, input, errors: issues(parsed.error) },
    );
  }

  if (!rows.length)
    throw new Error("Sheet keyword_targets tidak memiliki data.");
  return rows;
}

export async function parseRankCheckinWorkbook(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheet = workbook.getWorksheet("rank_checkins");
  if (!sheet) throw new Error("Sheet rank_checkins tidak ditemukan.");
  const headers = RANK_CHECKIN_COLUMNS.map((_, index) =>
    cellText(sheet.getCell(1, index + 1)),
  );
  if (headers.join("|") !== RANK_CHECKIN_COLUMNS.join("|")) {
    throw new Error("Header template rank_checkins tidak valid.");
  }
  if (Math.max(0, sheet.actualRowCount - 1) > MAX_IMPORT_ROWS) {
    throw new Error(`File melebihi ${MAX_IMPORT_ROWS} baris data.`);
  }

  const rows: ParsedImportRow<RankCheckinImportData>[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
    const input = Object.fromEntries(
      RANK_CHECKIN_COLUMNS.map((header, index) => [
        header,
        cellText(sheet.getCell(rowNumber, index + 1)),
      ]),
    );
    if (Object.values(input).every((value) => value === "")) continue;
    const parsed = rankCheckinRowSchema.safeParse(input);
    rows.push(
      parsed.success
        ? { rowNumber, input, data: parsed.data, errors: [] }
        : { rowNumber, input, errors: issues(parsed.error) },
    );
  }
  if (!rows.length) throw new Error("Sheet rank_checkins tidak memiliki data.");
  return rows;
}
