import { Suspense } from "react"

import { ApplicationTracker } from "@/components/dashboard/application-tracker"
import { OverviewHero } from "@/components/dashboard/overview-hero"
import {
  GettingStartedSection,
  MoreToolsSection,
  OverviewSections,
  RecentApplicationsSection,
} from "@/components/dashboard/overview-sections"
import { TrackedToast } from "@/components/dashboard/tracked-toast"
import { applicationsService } from "@/lib/applications/server"
import { requireSession } from "@/lib/auth/require-session"
import { getJobMatchCount } from "@/lib/dashboard/dashboard-metrics"
import { computeGettingStartedState } from "@/lib/dashboard/getting-started"
import { computeDashboardPipelineStats } from "@/lib/dashboard/pipeline-stats"
import { profileService } from "@/lib/profile"

export const dynamic = "force-dynamic"

export async function DashboardOverview() {
  const session = await requireSession()
  const [applications, profile, jobMatchCount] = await Promise.all([
    applicationsService.listByUser(session.id),
    profileService.getByUserId(session.id),
    getJobMatchCount(session.id),
  ])

  const gettingStarted = computeGettingStartedState(profile, applications)
  const completeness = profile?.completeness ?? { percent: 0, missing: ["Profile"] }
  const pipelineStats = computeDashboardPipelineStats(applications, jobMatchCount)
  const sortedApplications = [...applications].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <div className="mx-auto w-full max-w-6xl flex-1">
      <Suspense fallback={null}>
        <TrackedToast />
      </Suspense>

      <OverviewSections>
        <OverviewHero
          displayName={session.displayName}
          gettingStarted={gettingStarted}
          stats={pipelineStats}
          completeness={completeness}
        />
        {!gettingStarted.allComplete ? <GettingStartedSection state={gettingStarted} /> : null}
        <ApplicationTracker applications={sortedApplications} variant="compact" />
        <RecentApplicationsSection applications={sortedApplications} />
        <MoreToolsSection />
      </OverviewSections>
    </div>
  )
}
