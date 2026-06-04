import { NextResponse } from "next/server";

import {
  API_ERROR_STATUS,
  ApiErrorCode,
  toErrorResponse,
  toSuccessResponse,
} from "./errors";

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(toSuccessResponse(data), { status });
}

export function jsonError(
  code: ApiErrorCode | string,
  message: string,
  status?: number,
  details?: unknown,
) {
  const httpStatus =
    status ??
    API_ERROR_STATUS[code as ApiErrorCode] ??
    API_ERROR_STATUS[ApiErrorCode.INTERNAL_ERROR];
  return NextResponse.json(toErrorResponse(code, message, details), {
    status: httpStatus,
  });
}
