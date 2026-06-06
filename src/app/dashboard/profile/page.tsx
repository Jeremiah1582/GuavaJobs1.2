import { redirect } from "next/navigation"

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
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <ProfileForm initialProfile={profile} />
    </div>
  )
}
