import { z } from "zod";

const countryCode = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}$/, "Negara harus memakai kode ISO 2 huruf.");

const languageCode = z
  .string()
  .trim()
  .regex(
    /^[a-z]{2,3}(?:-[A-Z]{2})?$/,
    "Bahasa harus memakai kode seperti id atau en-US.",
  );

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Nama project wajib diisi.").max(100),
  siteUrl: z
    .string()
    .trim()
    .url("URL website tidak valid.")
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "URL harus memakai http atau https.",
    }),
  defaultCountry: countryCode,
  defaultLanguage: languageCode,
  timezone: z.string().trim().min(1, "Zona waktu wajib diisi.").max(100),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export function normalizeProjectInput(input: ProjectInput) {
  const url = new URL(input.siteUrl);
  url.hash = "";
  const siteUrl = url.toString().replace(/\/$/, "");

  return {
    ...input,
    siteUrl,
    domain: url.hostname.toLowerCase().replace(/^www\./, ""),
  };
}

export function parseProjectFormData(formData: FormData) {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    siteUrl: formData.get("siteUrl"),
    defaultCountry: formData.get("defaultCountry"),
    defaultLanguage: formData.get("defaultLanguage"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Data project tidak valid.",
    };
  }

  return { success: true as const, data: normalizeProjectInput(parsed.data) };
}
