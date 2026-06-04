import type { User } from "@/generated/prisma"
import { validateSessionUser, type SessionUser } from "../auth/session"
import { prisma } from "@/db"

export async function ensureUser(input: SessionUser): Promise<User> {
  const user = validateSessionUser(input)
  

  return prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
    },
    update: {
      email: user.email,
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
