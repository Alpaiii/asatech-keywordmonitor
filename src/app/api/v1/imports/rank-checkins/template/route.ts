import {
  buildRankCheckinTemplate,
  RANK_CHECKIN_TEMPLATE_FILENAME,
} from "@/features/imports/rank-checkin-template";
import { getApiUser } from "@/lib/api/auth";
import { apiError, requestId } from "@/lib/api/response";

export async function GET(request: Request) {
  const id = requestId(request);
  const auth = await getApiUser();
  if (!auth)
    return apiError(401, "UNAUTHENTICATED", "Session pengguna wajib.", id);
  const file = await buildRankCheckinTemplate();
  return new Response(file, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${RANK_CHECKIN_TEMPLATE_FILENAME}"`,
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
    },
  });
}
