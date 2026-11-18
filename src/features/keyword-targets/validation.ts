import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Deadline tidak valid.",
  });

const optionalUuid = z.union([
  z.literal(""),
  z.string().uuid("PIC tidak valid."),
]);

export const keywordTargetSchema = z
  .object({
    phrase: z.string().trim().min(1, "Keyword wajib diisi.").max(500),
    countryCode: z.string().regex(/^[A-Z]{2}$/, "Negara tidak valid."),
    languageCode: z
      .string()
      .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, "Bahasa tidak valid."),
    device: z.enum(["desktop", "mobile", "tablet"]),
    location: z.string().trim().max(200),
    targetPosition: z.coerce
      .number()
      .int()
      .min(1, "Target posisi minimal 1.")
      .max(100, "Target posisi maksimal 100."),
    priority: z.enum(["low", "medium", "high", "critical"]),
    deadline: optionalDate,
    maintainEnabled: z.boolean(),
    maintainPositionLimit: z.union([
      z.literal(""),
      z.coerce.number().int().min(1).max(100),
    ]),
    checkFrequencyDays: z.coerce.number().int().min(1).max(365),
    assigneeUserId: optionalUuid,
  })
  .refine(
    (value) => !value.maintainEnabled || value.maintainPositionLimit !== "",
    {
      message: "Batas maintain wajib diisi saat mode maintain aktif.",
      path: ["maintainPositionLimit"],
    },
  );

export type KeywordTargetInput = z.infer<typeof keywordTargetSchema>;

export function parseKeywordTargetFormData(formData: FormData) {
  const parsed = keywordTargetSchema.safeParse({
    phrase: formData.get("phrase"),
    countryCode: formData.get("countryCode"),
    languageCode: formData.get("languageCode"),
    device: formData.get("device"),
    location: formData.get("location") ?? "",
    targetPosition: formData.get("targetPosition"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline") ?? "",
    maintainEnabled: formData.get("maintainEnabled") === "on",
    maintainPositionLimit: formData.get("maintainPositionLimit") ?? "",
    checkFrequencyDays: formData.get("checkFrequencyDays"),
    assigneeUserId: formData.get("assigneeUserId") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Target keyword tidak valid.",
    };
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      deadline: parsed.data.deadline || null,
      maintainPositionLimit:
        parsed.data.maintainPositionLimit === ""
          ? null
          : parsed.data.maintainPositionLimit,
      assigneeUserId: parsed.data.assigneeUserId || null,
    },
  };
}
