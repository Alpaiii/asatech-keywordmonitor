const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateEvidenceFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return { success: false as const, error: "File evidence wajib dipilih." };
  }
  if (!ALLOWED_EVIDENCE_TYPES.has(value.type)) {
    return {
      success: false as const,
      error: "Evidence harus JPEG, PNG, WebP, atau PDF.",
    };
  }
  if (value.size > MAX_EVIDENCE_BYTES) {
    return {
      success: false as const,
      error: "Ukuran evidence maksimal 10 MiB.",
    };
  }
  return { success: true as const, file: value };
}

export function evidenceExtension(file: File) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  }[file.type];
}
