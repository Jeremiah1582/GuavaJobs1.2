"use server"

import { redirect } from "next/navigation"
import {
  applicationsService,
  jobsService,
  JobsServiceError,
  usersService,
} from "@guavajobs/core"

import { getSession } from "@/lib/auth/get-session"

export async function trackJobById(jobId: string): Promise<void> {
  const session = await getSession()
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/jobs/${jobId}?track=1`)}`)
  }

  await usersService.ensureUser(session)

  let job
  try {
    job = await jobsService.resolveListing(jobId)
  } catch (err) {
    if (err instanceof JobsServiceError && err.status === 503) {
      throw err
    }
    throw err
  }

  if (!job) {
    redirect("/jobs")
  }

  await applicationsService.createFromJobListing(session.id, job)
}

export async function trackJobAction(formData: FormData): Promise<void> {
  const jobId = formData.get("jobId")
  if (typeof jobId !== "string" || !jobId) {
    redirect("/jobs")
  }

  await trackJobById(jobId)
  redirect("/dashboard?tracked=1")
}
