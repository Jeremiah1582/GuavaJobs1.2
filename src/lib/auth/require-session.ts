import { ApiErrorCode } from "@/lib/api/errors";
import { jsonError } from "@/lib/api/response";
import { NextResponse } from "next/server";

import { getSession } from "./get-session";
import type { SessionUser } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Throws when no Supabase session (for server actions and legacy try/catch routes). */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Returns a 401 JSON response for Route Handlers. */
export async function requireSessionForApi(): Promise<
  SessionUser | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401);
  }
  return session;
}
