import { z } from "zod";

export const rankCheckinSchema = z
  .object({
    position: z.union([
      z.literal(""),
      z.coerce
        .number()
        .int()
        .min(1, "Posisi minimal 1.")
        .max(100, "Posisi maksimal 100."),
    ]),
    notFoundTop100: z.boolean(),
    checkedAt: z
      .string()
      .datetime({ local: true, message: "Waktu check-in tidak valid." }),
    notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter."),
  })
  .refine(
    (value) =>
      (value.position !== "" && !value.notFoundTop100) ||
      (value.position === "" && value.notFoundTop100),
    {
      message: "Isi posisi 1..100 atau tandai tidak ditemukan di top 100.",
      path: ["position"],
    },
  )
  .refine((value) => Date.parse(value.checkedAt) <= Date.now(), {
    message: "Waktu check-in tidak boleh berada di masa depan.",
    path: ["checkedAt"],
  });

export function parseRankCheckinFormData(formData: FormData) {
  const parsed = rankCheckinSchema.safeParse({
    position: formData.get("position") ?? "",
    notFoundTop100: formData.get("notFoundTop100") === "on",
    checkedAt: formData.get("checkedAt"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Check-in tidak valid.",
    };
  }

  return {
    success: true as const,
    data: {
      position: parsed.data.position === "" ? null : parsed.data.position,
      notFoundTop100: parsed.data.notFoundTop100,
      checkedAt: new Date(parsed.data.checkedAt).toISOString(),
      notes: parsed.data.notes || null,
    },
  };
}
