"use server"

import { redirect } from "next/navigation"
import { applicationsService } from "@/lib/applications/server"
import { jobsService } from "@/lib/jobs"
import { usersService } from "@/lib/users"

import { getSession } from "@/lib/auth/get-session"

export async function trackJobById(jobId: string): Promise<void> {
  const session = await getSession()
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/dashboard/jobs?track=${jobId}`)}`)
  }

  await usersService.ensureUser(session)

  const job = await jobsService.resolveListing(session.id, jobId)

  if (!job) {
    redirect("/dashboard/jobs")
  }

  await applicationsService.createFromJobListing(session.id, job)
}

export async function trackJobAction(formData: FormData): Promise<void> {
  const jobId = formData.get("jobId")
  if (typeof jobId !== "string" || !jobId) {
    redirect("/dashboard/jobs")
  }

  await trackJobById(jobId)
  redirect("/dashboard?tracked=1")
}
