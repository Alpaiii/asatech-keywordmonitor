import { describe, expect, it } from "vitest";
import {
  MAX_BULK_KEYWORD_TARGETS,
  parseBulkKeywordTargetFormData,
} from "./bulk";

const id = (index: number) =>
  `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;

function form(entries: Array<[string, string]>) {
  const formData = new FormData();
  for (const [key, value] of entries) formData.append(key, value);
  return formData;
}

describe("parseBulkKeywordTargetFormData", () => {
  it("menerima perubahan prioritas dan menghapus ID duplikat", () => {
    const result = parseBulkKeywordTargetFormData(
      form([
        ["operation", "priority"],
        ["targetId", id(1)],
        ["targetId", id(1)],
        ["priority", "critical"],
      ]),
    );

    expect(result).toEqual({
      success: true,
      data: {
        operation: "priority",
        targetIds: [id(1)],
        priority: "critical",
      },
    });
  });

  it("menerima pelepasan PIC", () => {
    const result = parseBulkKeywordTargetFormData(
      form([
        ["operation", "assignee"],
        ["targetId", id(1)],
        ["assigneeUserId", "unassigned"],
      ]),
    );

    expect(result.success && result.data).toMatchObject({
      operation: "assignee",
      assigneeUserId: null,
    });
  });

  it("menolak tanpa target", () => {
    const result = parseBulkKeywordTargetFormData(
      form([["operation", "evaluate"]]),
    );
    expect(result).toEqual({
      success: false,
      error: "Pilih minimal satu target keyword.",
    });
  });

  it("menolak target melampaui limit", () => {
    const entries: Array<[string, string]> = [["operation", "evaluate"]];
    for (let index = 0; index <= MAX_BULK_KEYWORD_TARGETS; index += 1) {
      entries.push(["targetId", id(index)]);
    }

    const result = parseBulkKeywordTargetFormData(form(entries));
    expect(result).toEqual({
      success: false,
      error: `Maksimal ${MAX_BULK_KEYWORD_TARGETS} target per operasi.`,
    });
  });

  it("menolak ID, operasi, dan nilai yang tidak valid", () => {
    expect(
      parseBulkKeywordTargetFormData(
        form([
          ["operation", "delete"],
          ["targetId", "invalid"],
        ]),
      ).success,
    ).toBe(false);
    expect(
      parseBulkKeywordTargetFormData(
        form([
          ["operation", "priority"],
          ["targetId", id(1)],
          ["priority", "urgent"],
        ]),
      ),
    ).toEqual({ success: false, error: "Prioritas tidak valid." });
  });
});
