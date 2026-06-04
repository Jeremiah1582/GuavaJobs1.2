import { redirect } from "next/navigation"

import { ProfileCompletenessBar } from "@/components/profile/profile-completeness"
import { ProfileForm } from "@/components/profile/profile-form"
import { getSession } from "@/lib/auth/get-session"
import { profileService } from "@/lib/profile"
import { usersService } from "@/lib/users"

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

  await usersService.ensureUser(session)
  await profileService.getOrCreateForUser(session.id)
  const profile = await profileService.getByUserId(session.id)

  if (!profile) {
    redirect("/sign-in?next=/dashboard/profile")
  }

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

      <div className="mb-8">
        <ProfileCompletenessBar completeness={profile.completeness} />
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  )
}
