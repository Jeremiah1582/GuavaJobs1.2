import { redirect } from "next/navigation"
import { Suspense } from "react"

import { OverviewHero } from "@/components/dashboard/overview-hero"
import {
  GettingStartedSection,
  MoreToolsSection,
  OverviewSections,
  RecentApplicationsSection,
} from "@/components/dashboard/overview-sections"
import { TrackedToast } from "@/components/dashboard/tracked-toast"
import { applicationsService } from "@/lib/applications/server"
import { getSession } from "@/lib/auth/get-session"
import { getJobMatchCount } from "@/lib/dashboard/dashboard-metrics"
import { computeGettingStartedState } from "@/lib/dashboard/getting-started"
import { computeDashboardPipelineStats } from "@/lib/dashboard/pipeline-stats"
import { profileService } from "@/lib/profile"
import { usersService } from "@/lib/users"

export const dynamic = "force-dynamic"

export async function DashboardOverview() {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/dashboard")
  }

  await usersService.ensureUser(session)
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
        <RecentApplicationsSection applications={sortedApplications} />
        <MoreToolsSection />
      </OverviewSections>
    </div>
  )
}
