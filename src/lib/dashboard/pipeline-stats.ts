import type { ApplicationListItem } from "@/lib/applications"

export type DashboardPipelineStats = {
  jobMatches: number
  applied: number
  interviews: number
  offers: number
}

export function computeDashboardPipelineStats(
  applications: ApplicationListItem[],
  jobMatchCount: number,
): DashboardPipelineStats {
  const interviews = applications.filter(
    (a) => a.status === "INTERVIEW" && !a.rejectionPhase,
  ).length
  const offers = applications.filter(
    (a) => (a.status === "OFFER" || a.status === "ACCEPTED") && !a.rejectionPhase,
  ).length

  return {
    jobMatches: jobMatchCount,
    applied: applications.length,
    interviews,
    offers,
  }
}
