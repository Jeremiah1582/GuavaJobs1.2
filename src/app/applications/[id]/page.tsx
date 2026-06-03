import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  MapPin,
  User,
} from "lucide-react"
import {
  applicationsService,
  ApplicationsServiceError,
  getApplicationRowClass,
  profileService,
  usersService,
} from "@guavajobs/core"

import { ApplicationCvSection } from "@/components/applications/application-cv-section"
import { ApplicationGeneratedToast } from "@/components/applications/application-generated-toast"
import { ApplicationLetterEditor } from "@/components/applications/application-letter-editor"
import { ApplicationTaxonomyFields } from "@/components/applications/application-taxonomy-fields"
import { LetterGroundingPanel } from "@/components/applications/letter-grounding-panel"
import { ProfileSnapshotCard } from "@/components/applications/profile-snapshot-card"
import { ApplicationStatusForm } from "@/components/dashboard/application-status-form"
import { ApplicationNotesPanel } from "@/components/dashboard/application-notes-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth/get-session"
import { cn } from "@/lib/utils"

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>
}

function formatStatus(status: string, rejectionPhase?: string | null): string {
  if (rejectionPhase === "PRE_INTERVIEW") return "Rejected (pre-interview)"
  if (rejectionPhase === "POST_INTERVIEW") return "Rejected (post-interview)"
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function getStatusColor(status: string, rejectionPhase?: string | null) {
  if (rejectionPhase) return "bg-red-500"
  switch (status) {
    case "DRAFT": return "bg-slate-400"
    case "APPLIED": return "bg-yellow-500"
    case "WAITING": return "bg-amber-500"
    case "INTERVIEW": return "bg-sky-500"
    case "OFFER": return "bg-blue-500"
    case "ACCEPTED": return "bg-emerald-500"
    default: return "bg-slate-400"
  }
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/applications")
  }

  const { id } = await params
  await usersService.ensureUser(session)

  let bundle
  try {
    bundle = await applicationsService.getBundleForUser(session.id, id)
  } catch (err) {
    if (err instanceof ApplicationsServiceError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const { application, jobDescriptionText, jobListingSnapshot, letter, profileSnapshot } =
    bundle
  const profile = await profileService.getByUserId(session.id)
  const externalLink = application.jobUrl
  const jobDescription =
    jobDescriptionText ?? application.jobDescriptionSnapshot ?? null

  const rowClass = getApplicationRowClass(application.status, application.rejectionPhase)
  const statusColor = getStatusColor(application.status, application.rejectionPhase)

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ApplicationGeneratedToast />
      </Suspense>

      {/* Hero Header with Status Color */}
      <header className={cn("border-b border-border/50", rowClass)}>
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <Button asChild variant="ghost" size="sm" className="gap-2 pl-0 hover:bg-transparent hover:text-foreground">
              <Link href="/applications">
                <ArrowLeft className="size-4" />
                Back to Applications
              </Link>
            </Button>
          </nav>

          {/* Title Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={cn("size-3 rounded-full", statusColor)} aria-hidden />
                <Badge variant="outline" className="border-current/20 bg-background/50">
                  {formatStatus(application.status, application.rejectionPhase)}
                </Badge>
              </div>
              <h1 className="font-serif text-3xl text-foreground md:text-4xl">
                {application.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" aria-hidden />
                  {application.company}
                </span>
                {application.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden />
                    {application.location}
                  </span>
                )}
                {application.salaryText && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="size-4" aria-hidden />
                    {application.salaryText}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Edit profile</Link>
              </Button>
              <ApplicationStatusForm
                applicationId={application.id}
                currentStatus={application.status}
              />
              {externalLink && (
                <Button asChild variant="outline" size="sm">
                  <a href={externalLink} target="_blank" rel="noopener noreferrer">
                    View job
                    <ExternalLink className="ml-1.5 size-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 md:grid-cols-4">
            {application.source && (
              <div className="rounded-lg bg-background/50 p-3">
                <dt className="text-xs text-muted-foreground">Source</dt>
                <dd className="mt-1 font-medium">{application.source}</dd>
              </div>
            )}
            {application.appliedAt && (
              <div className="rounded-lg bg-background/50 p-3">
                <dt className="text-xs text-muted-foreground">Applied</dt>
                <dd className="mt-1 font-medium">
                  {application.appliedAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {application.nextStep && (
              <div className="rounded-lg bg-background/50 p-3">
                <dt className="text-xs text-muted-foreground">Next Step</dt>
                <dd className="mt-1 font-medium">{application.nextStep}</dd>
              </div>
            )}
            {application.contactName && (
              <div className="rounded-lg bg-background/50 p-3">
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd className="mt-1 font-medium">{application.contactName}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Interview Section */}
            {application.interviewRound && (
              <section className="overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100/50 dark:border-sky-900 dark:from-sky-950/50 dark:to-sky-900/30">
                <div className="border-b border-sky-200/50 bg-sky-100/50 px-5 py-3 dark:border-sky-800/50 dark:bg-sky-900/30">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-100">
                    <Calendar className="size-4" />
                    Interview Scheduled
                  </h2>
                </div>
                <div className="p-5">
                  <p className="text-lg font-medium text-foreground">
                    Round {application.interviewRound}
                  </p>
                  {application.interviewScheduledAt && (
                    <p className="mt-1 text-muted-foreground">
                      {application.interviewScheduledAt.toLocaleString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {application.interviewLocation && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {application.interviewLocation}
                      </span>
                    )}
                    {application.interviewUrl && (
                      <a
                        href={application.interviewUrl}
                        className="flex items-center gap-1.5 text-sm text-sky-600 hover:underline dark:text-sky-400"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Job Description */}
            {(jobListingSnapshot || jobDescription) && (
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Briefcase className="size-4" />
                    Job snapshot
                  </h2>
                </div>
                <div className="p-5">
                  {jobListingSnapshot && (
                    <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
                      {jobListingSnapshot.salaryText && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Salary</dt>
                          <dd className="mt-0.5 font-medium">{jobListingSnapshot.salaryText}</dd>
                        </div>
                      )}
                      {jobListingSnapshot.category && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Category</dt>
                          <dd className="mt-0.5 font-medium">{jobListingSnapshot.category}</dd>
                        </div>
                      )}
                      {jobListingSnapshot.contractType && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Contract</dt>
                          <dd className="mt-0.5 font-medium">{jobListingSnapshot.contractType}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {jobDescription && (
                    <div className="max-h-96 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {jobDescription}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Cover Letter */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4" />
                  Cover letter
                </h2>
              </div>
              <div className="p-5">
                <ApplicationLetterEditor
                  applicationId={application.id}
                  company={application.company}
                  initialLetter={letter}
                  isAiAssisted={bundle.flags.isAiAssisted}
                />
                <LetterGroundingPanel citations={letter?.citations ?? []} />
              </div>
            </section>

            {/* CV / Resume Section */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="size-4" />
                  Resume / CV
                </h2>
              </div>
              <div className="p-5">
                <ApplicationCvSection cvFileUrl={profile?.cvFileUrl ?? null} />
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <ProfileSnapshotCard
              applicationId={application.id}
              snapshot={profileSnapshot}
            />

            {/* Notes Panel */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">Notes</h2>
              </div>
              <div className="p-5">
                <ApplicationNotesPanel
                  applicationId={application.id}
                  initialNotes={application.notes}
                />
              </div>
            </section>

            {/* Additional Details */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">Job metadata</h2>
              </div>
              <div className="p-5 space-y-5">
                <ApplicationTaxonomyFields
                  applicationId={application.id}
                  jobCategory={application.jobCategory}
                  employmentType={application.employmentType}
                  jobCategoryOther={application.jobCategoryOther}
                />
                <dl className="space-y-3 text-sm">
                  {application.industry && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Industry</dt>
                      <dd className="mt-0.5 font-medium">{application.industry}</dd>
                    </div>
                  )}
                  {application.fitScore && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Fit Score</dt>
                      <dd className="mt-0.5 font-medium">{application.fitScore}</dd>
                    </div>
                  )}
                  {application.viaRecruiter && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Via Recruiter</dt>
                      <dd className="mt-0.5 font-medium">Yes</dd>
                    </div>
                  )}
                  {application.requirementsNotes && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Requirements</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {application.requirementsNotes}
                      </dd>
                    </div>
                  )}
                  {application.aboutNotes && (
                    <div>
                      <dt className="text-xs text-muted-foreground">About</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {application.aboutNotes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>

            {/* External Links */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">Links</h2>
              </div>
              <div className="flex flex-col gap-2 p-5">
                {externalLink && (
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <span>Job Posting</span>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </a>
                )}
                {application.jobExternalId && (
                  <Link
                    href={`/jobs?job=${encodeURIComponent(application.jobExternalId)}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <span>View on Job Board</span>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </Link>
                )}
              </div>
            </section>

            {/* Footer Meta */}
            <p className="text-center text-xs text-muted-foreground">
              Last updated {application.updatedAt.toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
