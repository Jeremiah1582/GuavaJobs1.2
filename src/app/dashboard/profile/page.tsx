import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth/get-session"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Profile",
  description: "Your career profile powers job matching and AI cover letters.",
}

export default async function DashboardProfilePage() {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/dashboard/profile")
  }

  // Profile service loads after core absorption (Phase 0).
  // Placeholder until profileService is wired to Postgres.
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Your profile
        </h1>
        <p className="mt-2 text-muted-foreground">
          Complete your profile so applications and cover letters stay accurate
          with minimum effort. Your CV scanner can pre-fill this page.
        </p>
      </header>
      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Profile data loading is enabled in Phase 0 (core absorption + Postgres).
        Components are ready under{" "}
        <code className="text-foreground">src/components/profile/</code>.
      </p>
    </div>
  )
}
