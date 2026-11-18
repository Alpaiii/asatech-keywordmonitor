import {
  buildKeywordTargetTemplate,
  KEYWORD_TARGET_TEMPLATE_FILENAME,
} from "@/features/imports/keyword-target-template";
import { getApiUser } from "@/lib/api/auth";
import { apiError, requestId } from "@/lib/api/response";

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth) {
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  }

  try {
    const file = await buildKeywordTargetTemplate();
    return new Response(file, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="${KEYWORD_TARGET_TEMPLATE_FILENAME}"`,
        "content-length": String(file.byteLength),
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "x-content-type-options": "nosniff",
        "x-request-id": id,
      },
    });
  } catch {
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Template keyword gagal dibuat.",
      id,
    );
  }
}
