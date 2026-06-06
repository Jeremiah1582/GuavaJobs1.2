import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/shell"
import { getSession } from "@/lib/auth/get-session"
import { usersService } from "@/lib/users"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/dashboard")
  }

  await usersService.ensureUser(session)

  return (
    <DashboardShell displayName={session.displayName} email={session.email}>
      {children}
    </DashboardShell>
  )
}
