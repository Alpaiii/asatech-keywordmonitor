import { z } from "zod";
import { AUDIT_CATEGORIES, type AuditCategory } from "./keyword-audit";

const optionalUuid = z.string().uuid().optional();
const categorySchema = z.enum(AUDIT_CATEGORIES).optional();

export type AuditFilters = {
  project?: string;
  category?: AuditCategory;
};

export function parseAuditFilters(input: Record<string, unknown>) {
  const filters: AuditFilters = {};
  const project = optionalUuid.safeParse(input.project);
  const category = categorySchema.safeParse(input.category);

  if (project.success && project.data) filters.project = project.data;
  if (category.success && category.data) filters.category = category.data;

  return filters;
}
