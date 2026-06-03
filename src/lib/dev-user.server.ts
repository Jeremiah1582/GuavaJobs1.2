// src/lib/dev-user.server.ts — ensures dev user exists in SQLite (server only)
import { prisma } from "@/db";
import { DEV_USER, DEV_USER_ID, type AppUser } from "@/lib/dev-user";

let ensured = false;

export async function ensureDevUser(): Promise<AppUser> {
  if (ensured) return DEV_USER;

  const existing = await prisma.user.findFirst({
    where: { id: DEV_USER_ID },
  });

  if (!existing) {
    const now = Date.now();
    await prisma.user.create({
      data: {
        id: DEV_USER_ID,
        name: DEV_USER.name,
        email: DEV_USER.email,
        emailVerified: 1,
        updatedAt: now,
      },
    });
  }

  ensured = true;
  return DEV_USER;
}
