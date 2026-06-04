import { NextResponse } from "next/server";

import { ApiErrorCode, API_ERROR_STATUS, toErrorResponse } from "./errors";

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: Request,
  context: RouteContext,
) => Promise<Response> | Response;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error("[api]", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      const code = ApiErrorCode.INTERNAL_ERROR;
      const status = API_ERROR_STATUS[code];
      return NextResponse.json(toErrorResponse(code, message), { status });
    }
  };
}
