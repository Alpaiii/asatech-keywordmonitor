import { z } from "zod";

export const MAX_BULK_KEYWORD_TARGETS = 100;

const idSchema = z.string().uuid();
const operationSchema = z.enum(["priority", "assignee", "evaluate"]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const assigneeSchema = z.union([z.literal("unassigned"), idSchema]);

export type BulkKeywordTargetInput =
  | {
      operation: "priority";
      targetIds: string[];
      priority: "low" | "medium" | "high" | "critical";
    }
  | {
      operation: "assignee";
      targetIds: string[];
      assigneeUserId: string | null;
    }
  | {
      operation: "evaluate";
      targetIds: string[];
    };

export function parseBulkKeywordTargetFormData(formData: FormData) {
  const operation = operationSchema.safeParse(formData.get("operation"));
  const targetIds = [
    ...new Set(
      formData
        .getAll("targetId")
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  const parsedIds = z
    .array(idSchema)
    .min(1, "Pilih minimal satu target keyword.")
    .max(
      MAX_BULK_KEYWORD_TARGETS,
      `Maksimal ${MAX_BULK_KEYWORD_TARGETS} target per operasi.`,
    )
    .safeParse(targetIds);

  if (!operation.success) {
    return { success: false as const, error: "Operasi bulk tidak valid." };
  }
  if (!parsedIds.success) {
    return {
      success: false as const,
      error: parsedIds.error.issues[0]?.message ?? "Target tidak valid.",
    };
  }

  if (operation.data === "priority") {
    const priority = prioritySchema.safeParse(formData.get("priority"));
    if (!priority.success) {
      return { success: false as const, error: "Prioritas tidak valid." };
    }
    return {
      success: true as const,
      data: {
        operation: operation.data,
        targetIds: parsedIds.data,
        priority: priority.data,
      } satisfies BulkKeywordTargetInput,
    };
  }

  if (operation.data === "assignee") {
    const assignee = assigneeSchema.safeParse(formData.get("assigneeUserId"));
    if (!assignee.success) {
      return { success: false as const, error: "PIC tidak valid." };
    }
    return {
      success: true as const,
      data: {
        operation: operation.data,
        targetIds: parsedIds.data,
        assigneeUserId: assignee.data === "unassigned" ? null : assignee.data,
      } satisfies BulkKeywordTargetInput,
    };
  }

  return {
    success: true as const,
    data: {
      operation: operation.data,
      targetIds: parsedIds.data,
    } satisfies BulkKeywordTargetInput,
  };
}
