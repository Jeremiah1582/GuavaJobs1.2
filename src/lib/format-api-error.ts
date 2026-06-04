export type ApiErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  devMessage?: string;
};

export function apiErrorMessage(
  payload: ApiErrorPayload,
  fallback = "Request failed",
): string {
  return payload.error?.trim() || payload.message?.trim() || fallback;
}

export function formatApiErrorDetails(details: unknown): string {
  if (details == null) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}
