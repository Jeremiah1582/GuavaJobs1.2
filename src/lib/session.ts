// src/lib/session.ts — auth disabled; always use the local dev user
import { ensureDevUser } from "@/lib/dev-user.server";
import type { AppUser } from "@/lib/dev-user";

export async function getSession() {
  const user = await ensureDevUser();
  return { user };
}

export async function requireAuth(): Promise<AppUser> {
  return ensureDevUser();
}
