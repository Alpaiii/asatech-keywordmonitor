import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "PROVIDER_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}

export function apiSuccess<T>(data: T, id: string, init?: ResponseInit) {
  const response = NextResponse.json({ data }, init);
  response.headers.set("x-request-id", id);
  return response;
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  id: string,
) {
  const response = NextResponse.json(
    { error: { code, message, requestId: id } },
    { status },
  );
  response.headers.set("x-request-id", id);
  return response;
}
