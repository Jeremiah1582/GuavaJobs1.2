import { prisma } from "@/db"
import { buildJobListItems, listJobsForUser } from "@/lib/jobs-api"

/** Minimum match score counted as a relevant job match on the dashboard. */
const MATCH_THRESHOLD = 70

/** Scored listings at or above the match threshold for the user's active resume. */
export async function getJobMatchCount(userId: string): Promise<number> {
  const resume = await prisma.resume.findFirst({
    where: { userId, isActive: 1 },
  })

  const { cached, matches, saved, applied } = await listJobsForUser(userId, resume?.id ?? null)
  const jobs = buildJobListItems(cached, matches, saved, applied)

  return jobs.filter((j) => j.matchScore !== null && j.matchScore >= MATCH_THRESHOLD).length
}
