import type { NextResponse } from "next/server";

import { jsonError } from "./response";

type ServiceErrorLike = Error & {
  code: string;
  status: number;
  userMessage?: string;
};

function isServiceError(err: unknown): err is ServiceErrorLike {
  return (
    err instanceof Error &&
    typeof (err as ServiceErrorLike).code === "string" &&
    typeof (err as ServiceErrorLike).status === "number"
  );
}

/** Map domain service errors to JSON responses; return null to rethrow. */
export function handleServiceError(err: unknown): NextResponse | null {
  if (!isServiceError(err)) return null;
  return jsonError(
    err.code,
    err.userMessage ?? err.message,
    err.status,
  );
}
