import type { ApplicationListItem } from "@/lib/applications"
import type { ApplicationStatus } from "@/lib/applications/row-styles"
import { STAGE_ORDER } from "@/lib/applications/constants"

export type DashboardPipelineStats = {
  jobMatches: number
  applied: number
  interviews: number
  offers: number
}

/** Filter key for pipeline stage chips on the applications list. */
export type PipelineStageFilter =
  | "ALL"
  | ApplicationStatus
  | "OFFER"
  | "REJECTED"

export type PipelineStageCounts = {
  total: number
  rejected: number
} & Record<(typeof STAGE_ORDER)[number], number>

export function computeStageCounts(
  applications: ApplicationListItem[],
): PipelineStageCounts {
  const counts: PipelineStageCounts = {
    total: applications.length,
    rejected: 0,
    DRAFT: 0,
    APPLIED: 0,
    WAITING: 0,
    INTERVIEW: 0,
    OFFER: 0,
    ACCEPTED: 0,
  }

  for (const app of applications) {
    if (app.rejectionPhase) {
      counts.rejected += 1
      continue
    }
    counts[app.status] += 1
  }

  return counts
}

export function filterApplicationsByStage(
  applications: ApplicationListItem[],
  stage: PipelineStageFilter,
): ApplicationListItem[] {
  if (stage === "ALL") return applications
  if (stage === "REJECTED") {
    return applications.filter((a) => Boolean(a.rejectionPhase))
  }
  if (stage === "OFFER") {
    return applications.filter(
      (a) => !a.rejectionPhase && (a.status === "OFFER" || a.status === "ACCEPTED"),
    )
  }
  return applications.filter((a) => !a.rejectionPhase && a.status === stage)
}

export function parsePipelineStageFilter(
  value: string | undefined,
): PipelineStageFilter {
  if (!value || value === "ALL") return "ALL"
  if (value === "REJECTED" || value === "OFFER") return value
  if ((STAGE_ORDER as readonly string[]).includes(value)) {
    return value as ApplicationStatus
  }
  return "ALL"
}

export function computeDashboardPipelineStats(
  applications: ApplicationListItem[],
  jobMatchCount: number,
): DashboardPipelineStats {
  const stageCounts = computeStageCounts(applications)

  return {
    jobMatches: jobMatchCount,
    applied: applications.length,
    interviews: stageCounts.INTERVIEW,
    offers: stageCounts.OFFER + stageCounts.ACCEPTED,
  }
}
