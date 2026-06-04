import { NextResponse } from "next/server";

import { usersService } from "@/lib/users";

import { getSession } from "./get-session";
import type { SessionUser } from "./session";

/** Session + Prisma user row for legacy InternHunt API routes. */
export async function getLegacyApiSession(): Promise<
  SessionUser | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }
  await usersService.ensureUser(session);
  return session;
}

export function isSessionResponse(
  value: SessionUser | NextResponse,
): value is NextResponse {
  return value instanceof Response;
}
