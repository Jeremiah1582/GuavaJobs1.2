import { Suspense } from "react"
import Link from "next/link"
import { Briefcase, Plus } from "lucide-react"
import { applicationsService } from "@/lib/applications/server"
import { requireSession } from "@/lib/auth/require-session"

import { ApplicationsListView } from "@/components/applications/applications-list-view"
import { TrackedToast } from "@/components/dashboard/tracked-toast"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { parsePipelineStageFilter } from "@/lib/dashboard/pipeline-stats"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Applications - Guavajobs",
  description: "Track and manage all your job applications in one place.",
}

type ApplicationsPageProps = {
  searchParams: Promise<{ stage?: string }>
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const session = await requireSession()
  const { stage: stageParam } = await searchParams
  const initialStage = parsePipelineStageFilter(stageParam)

  const applications = await applicationsService.listByUser(session.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Suspense fallback={null}>
        <TrackedToast />
      </Suspense>

      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Applications
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track every role you pursue. Click a row to expand details or open the full page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/jobs">
                <Briefcase className="mr-2 size-4" aria-hidden />
                Browse Jobs
              </Link>
            </Button>
            <Button asChild className="bg-guava-pink-gradient text-accent-foreground hover:opacity-90">
              <Link href="/dashboard/applications/new">
                <Plus className="mr-2 size-4" aria-hidden />
                Add Manually
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {applications.length > 0 ? (
        <ApplicationsListView applications={applications} initialStage={initialStage} />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Track a job from the board or add one manually to start your pipeline."
          action={{ label: "Browse jobs", href: "/dashboard/jobs" }}
        />
      )}
    </div>
  )
}
