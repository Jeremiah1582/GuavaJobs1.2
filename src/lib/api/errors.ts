import type { ApiErrorBody, ApiErrorResponse } from "./types";

export enum ApiErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/** Suggested HTTP status per error code (used by App Route Handlers). */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.QUOTA_EXCEEDED]: 403,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
};

export function toErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  const body: ApiErrorBody = { code, message };
  if (details !== undefined) {
    body.details = details;
  }
  return { error: body };
}

export function toSuccessResponse<T>(data: T): { data: T } {
  return { data };
}
