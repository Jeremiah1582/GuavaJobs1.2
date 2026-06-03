import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Briefcase, Plus } from "lucide-react"
import { applicationsService, usersService } from "@guavajobs/core"

import { ApplicationsTable } from "@/components/applications/applications-table"
import { TrackedToast } from "@/components/dashboard/tracked-toast"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth/get-session"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Applications - Guavajobs",
  description: "Track and manage all your job applications in one place.",
}

export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/applications")
  }

  await usersService.ensureUser(session)
  const applications = await applicationsService.listByUser(session.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <Suspense fallback={null}>
        <TrackedToast />
      </Suspense>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground md:text-4xl">
              Applications
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track every role you pursue. Click a row to expand details or open the full page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/jobs">
                <Briefcase className="mr-2 size-4" aria-hidden />
                Browse Jobs
              </Link>
            </Button>
            <Button asChild className="bg-guava-pink-gradient text-accent-foreground hover:opacity-90">
              <Link href="/applications/new">
                <Plus className="mr-2 size-4" aria-hidden />
                Add Manually
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {applications.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Total", count: applications.length, color: "bg-slate-100 dark:bg-slate-900" },
            { label: "Draft", count: applications.filter(a => a.status === "DRAFT" && !a.rejectionPhase).length, color: "bg-slate-50 dark:bg-slate-950" },
            { label: "Applied", count: applications.filter(a => a.status === "APPLIED" && !a.rejectionPhase).length, color: "bg-yellow-50 dark:bg-yellow-950/30" },
            { label: "Interview", count: applications.filter(a => a.status === "INTERVIEW" && !a.rejectionPhase).length, color: "bg-sky-50 dark:bg-sky-950/30" },
            { label: "Offer", count: applications.filter(a => (a.status === "OFFER" || a.status === "ACCEPTED") && !a.rejectionPhase).length, color: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Rejected", count: applications.filter(a => a.rejectionPhase).length, color: "bg-red-50 dark:bg-red-950/30" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border border-border/50 px-4 py-3 ${stat.color}`}
            >
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {stat.count}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Applications List */}
      {applications.length > 0 ? (
        <ApplicationsTable applications={applications} />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Track a job from the board or add one manually to start your pipeline."
          action={{ label: "Browse jobs", href: "/jobs" }}
        />
      )}
    </div>
  )
}
