import { z } from "zod";

const optionalUuid = z.string().uuid().optional();
const prioritySchema = z.enum(["low", "medium", "high", "critical"]).optional();
const statusSchema = z
  .enum([
    "no_data",
    "overdue",
    "maintain_warning",
    "stale",
    "achieved",
    "at_risk",
    "on_track",
  ])
  .optional();
const maintainSchema = z.enum(["enabled", "disabled"]).optional();
const picSchema = z
  .union([z.literal("unassigned"), z.string().uuid()])
  .optional();

export type KeywordTargetFilters = {
  project?: string;
  pic?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?:
    | "no_data"
    | "overdue"
    | "maintain_warning"
    | "stale"
    | "achieved"
    | "at_risk"
    | "on_track";
  maintain?: "enabled" | "disabled";
};

export function parseKeywordTargetFilters(input: Record<string, unknown>) {
  const filters: KeywordTargetFilters = {};
  const project = optionalUuid.safeParse(input.project);
  const pic = picSchema.safeParse(input.pic);
  const priority = prioritySchema.safeParse(input.priority);
  const status = statusSchema.safeParse(input.status);
  const maintain = maintainSchema.safeParse(input.maintain);

  if (project.success && project.data) filters.project = project.data;
  if (pic.success && pic.data) filters.pic = pic.data;
  if (priority.success && priority.data) filters.priority = priority.data;
  if (status.success && status.data) filters.status = status.data;
  if (maintain.success && maintain.data) filters.maintain = maintain.data;

  return filters;
}

export function hasKeywordTargetFilters(filters: KeywordTargetFilters) {
  return Object.values(filters).some(Boolean);
}
