import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    data: {
      service: "keywordscope",
      status: "ok",
      database: isSupabaseConfigured ? "configured" : "not_configured",
    },
  });
}
