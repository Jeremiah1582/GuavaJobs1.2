// src/lib/dev-user.server.ts — ensures dev user row exists in Postgres (server only)
import { prisma } from "@/db";
import { DEV_USER, DEV_USER_ID, type AppUser } from "@/lib/dev-user";

let ensured = false;

export async function ensureDevUser(): Promise<AppUser> {
  if (ensured) return DEV_USER;

  const existing = await prisma.user.findUnique({
    where: { id: DEV_USER_ID },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: DEV_USER_ID,
        email: DEV_USER.email,
        displayName: DEV_USER.name,
      },
    });
  }

  ensured = true;
  return DEV_USER;
}
