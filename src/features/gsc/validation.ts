import { z } from "zod";

export const googleProviderSchema = z.enum(["gsc", "ga4"]);

export const gscSearchTypeSchema = z.enum(["web", "image", "video", "news"]);

export const gscFiltersSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    searchType: gscSearchTypeSchema.default("web"),
    country: z
      .string()
      .regex(/^[A-Za-z]{3}$/)
      .optional(),
    device: z.enum(["desktop", "mobile", "tablet"]).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "Tanggal awal harus sebelum tanggal akhir.",
  });

export const gscTableFiltersSchema = gscFiltersSchema.extend({
  search: z.string().trim().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(["clicks", "impressions", "ctr", "position"]).default("clicks"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export function parseSearchParams(url: URL) {
  return Object.fromEntries(url.searchParams.entries());
}
