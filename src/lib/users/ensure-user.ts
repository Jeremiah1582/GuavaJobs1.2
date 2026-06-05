import type { User } from "@/generated/prisma"
import { validateSessionUser, type SessionUser } from "../auth/session"
import { prisma } from "@/db"

function defaultDisplayName(email: string, displayName?: string): string | undefined {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0]?.trim();
  return local || undefined;
}

export async function ensureUser(input: SessionUser): Promise<User> {
  const user = validateSessionUser(input);
  const displayName = defaultDisplayName(user.email, input.displayName);

  return getPrisma().user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      displayName,
    },
    update: {
      email: user.email,
      ...(displayName ? { displayName } : {}),
    },
  });
}

export async function deleteUser(id: string): Promise<void> {
  
  await getPrisma().user.delete({ where: { id } })
}

export const usersService = {
  ensureUser,
  deleteUser,
}
