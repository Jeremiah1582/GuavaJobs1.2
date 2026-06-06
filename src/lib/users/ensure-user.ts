import type { User } from "@/generated/prisma"
import { validateSessionUser, type SessionUser } from "../auth/session"
import { prisma } from "@/db"

function defaultDisplayName(email: string, displayName?: string): string | undefined {
  const trimmed = displayName?.trim()
  if (trimmed) return trimmed
  const local = email.split("@")[0]?.trim()
  return local || undefined
}

export async function ensureUser(input: SessionUser): Promise<User> {
  const user = validateSessionUser(input)
  const sessionDisplayName = defaultDisplayName(user.email, input.displayName)

  const existing = await prisma.user.findUnique({ where: { id: user.id } })

  if (!existing) {
    return prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        displayName: sessionDisplayName ?? null,
      },
    })
  }

  // Never overwrite a name the user saved in their profile — only fill when empty.
  const shouldSetDisplayName =
    !existing.displayName?.trim() && Boolean(sessionDisplayName)

  return prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.email,
      ...(shouldSetDisplayName ? { displayName: sessionDisplayName } : {}),
    },
  })
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } })
}

export const usersService = {
  ensureUser,
  deleteUser,
}
