import { notFound } from "next/navigation"

import { ProfileForm } from "@/components/profile/profile-form"
import { requireSession } from "@/lib/auth/require-session"
import { profileService } from "@/lib/profile"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Profile",
  description: "Your career profile powers job matching and AI cover letters.",
}

export default async function DashboardProfilePage() {
  const session = await requireSession()

  await profileService.getOrCreateForUser(session.id)
  const profile = await profileService.getByUserId(session.id)

  if (!profile) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <ProfileForm initialProfile={profile} />
    </div>
  )
}
