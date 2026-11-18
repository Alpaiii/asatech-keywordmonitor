import { describe, expect, it } from "vitest";
import { evidenceExtension, validateEvidenceFile } from "./validation";

describe("validateEvidenceFile", () => {
  it("menerima PNG", () => {
    const file = new File(["image"], "evidence.png", { type: "image/png" });
    expect(validateEvidenceFile(file).success).toBe(true);
    expect(evidenceExtension(file)).toBe("png");
  });

  it("menolak MIME tidak didukung", () => {
    const file = new File(["text"], "evidence.txt", { type: "text/plain" });
    expect(validateEvidenceFile(file).success).toBe(false);
  });

  it("menolak file kosong", () => {
    const file = new File([], "empty.png", { type: "image/png" });
    expect(validateEvidenceFile(file).success).toBe(false);
  });

  it("menolak file di atas 10 MiB", () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", {
      type: "application/pdf",
    });
    expect(validateEvidenceFile(file).success).toBe(false);
  });
});
