"use client"

import { useCallback, useState, useTransition } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  MessageSquare,
  UserRound,
} from "lucide-react"
import type { ApplicationDetail, ApplicationListItem } from "@/lib/applications"
import {
  formatApplicationStatusLabel,
  formatJobCategoryLabel,
  getApplicationRowClass,
  JOB_CATEGORY_VALUES,
  PIPELINE_STATUS_OPTIONS,
  type JobCategory,
} from "@/lib/applications"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  addApplicationNoteAction,
  advanceApplicationStageAction,
  clearApplicationRejectionAction,
  getApplicationDetailAction,
  rejectApplicationAction,
  setInterviewDetailsAction,
  updateApplicationStatusAction,
} from "@/lib/applications/actions"
import { cn } from "@/lib/utils"

type ApplicationTrackerProps = {
  applications: ApplicationListItem[]
}

function getStatusIndicator(status: string, rejectionPhase?: string | null) {
  if (rejectionPhase) {
    return { label: "Rejected", color: "bg-red-500" }
  }
  switch (status) {
    case "DRAFT":
      return { label: "Draft", color: "bg-slate-400" }
    case "APPLIED":
      return { label: "Applied", color: "bg-yellow-500" }
    case "WAITING":
      return { label: "Waiting", color: "bg-amber-500" }
    case "INTERVIEW":
      return { label: "Interview", color: "bg-sky-500" }
    case "OFFER":
      return { label: "Offer", color: "bg-blue-500" }
    case "ACCEPTED":
      return { label: "Accepted", color: "bg-emerald-500" }
    default:
      return { label: status, color: "bg-slate-400" }
  }
}

export function ApplicationsTable({ applications }: ApplicationTrackerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, ApplicationDetail>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [interviewDrafts, setInterviewDrafts] = useState<
    Record<string, { round: string; at: string; location: string; url: string }>
  >({})
  const [showInterviewForm, setShowInterviewForm] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | JobCategory>("ALL")

  const visibleApplications =
    categoryFilter === "ALL"
      ? applications
      : applications.filter((application) => application.jobCategory === categoryFilter)

  const loadDetail = useCallback(
    async (id: string) => {
      if (details[id]) return details[id]
      setLoadingId(id)
      try {
        const detail = await getApplicationDetailAction(id)
        setDetails((prev) => ({ ...prev, [id]: detail }))
        return detail
      } catch {
        toast.error("Could not load application details")
        return null
      } finally {
        setLoadingId(null)
      }
    },
    [details],
  )

  async function refreshDetail(id: string) {
    const detail = await getApplicationDetailAction(id)
    setDetails((prev) => ({ ...prev, [id]: detail }))
    return detail
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    await loadDetail(id)
  }

  function onStatusChange(
    applicationId: string,
    status: (typeof PIPELINE_STATUS_OPTIONS)[number],
  ) {
    if (status === "INTERVIEW") {
      setShowInterviewForm(applicationId)
      return
    }
    startTransition(async () => {
      try {
        await updateApplicationStatusAction(applicationId, status)
        await refreshDetail(applicationId)
        toast.success("Status updated")
      } catch {
        toast.error("Could not update status")
      }
    })
  }

  function onNextStage(applicationId: string, detail: ApplicationDetail) {
    if (detail.rejectionPhase) {
      toast.error("Clear rejection before advancing")
      return
    }
    if (detail.status === "INTERVIEW") {
      startTransition(async () => {
        try {
          await advanceApplicationStageAction(applicationId)
          await refreshDetail(applicationId)
          toast.success("Advanced to next interview round")
        } catch {
          toast.error("Could not advance stage")
        }
      })
      return
    }
    const next =
      detail.status === "DRAFT"
        ? "APPLIED"
        : detail.status === "APPLIED"
          ? "WAITING"
          : detail.status === "WAITING"
            ? "INTERVIEW"
            : detail.status === "OFFER"
              ? "ACCEPTED"
              : null
    if (next === "INTERVIEW") {
      setShowInterviewForm(applicationId)
      return
    }
    if (!next) {
      toast.message("Already at the final stage")
      return
    }
    startTransition(async () => {
      try {
        await updateApplicationStatusAction(
          applicationId,
          next as (typeof PIPELINE_STATUS_OPTIONS)[number],
        )
        await refreshDetail(applicationId)
        toast.success("Moved to next stage")
      } catch {
        toast.error("Could not advance")
      }
    })
  }

  function onReject(applicationId: string) {
    startTransition(async () => {
      try {
        await rejectApplicationAction(applicationId)
        await refreshDetail(applicationId)
        toast.error("Application marked rejected")
      } catch {
        toast.error("Could not mark rejected")
      }
    })
  }

  function onClearRejection(applicationId: string) {
    startTransition(async () => {
      try {
        await clearApplicationRejectionAction(applicationId)
        await refreshDetail(applicationId)
        toast.success("Rejection cleared")
      } catch {
        toast.error("Could not clear rejection")
      }
    })
  }

  function onSaveInterview(applicationId: string) {
    const draft = interviewDrafts[applicationId]
    if (!draft?.round || !draft.at) {
      toast.error("Round and date are required")
      return
    }
    if (!draft.location.trim() && !draft.url.trim()) {
      toast.error("Add a location or interview URL")
      return
    }
    startTransition(async () => {
      try {
        await setInterviewDetailsAction(applicationId, {
          interviewRound: Number(draft.round),
          interviewScheduledAt: new Date(draft.at),
          interviewLocation: draft.location.trim() || undefined,
          interviewUrl: draft.url.trim() || undefined,
        })
        setShowInterviewForm(null)
        await refreshDetail(applicationId)
        toast.success("Interview details saved")
      } catch {
        toast.error("Could not save interview details")
      }
    })
  }

  function onAddNote(applicationId: string) {
    const body = noteDrafts[applicationId]?.trim()
    if (!body) return

    startTransition(async () => {
      try {
        await addApplicationNoteAction(applicationId, body)
        setNoteDrafts((prev) => ({ ...prev, [applicationId]: "" }))
        await refreshDetail(applicationId)
        toast.success("Note added")
      } catch {
        toast.error("Could not add note")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <label htmlFor="applications-category-filter" className="text-xs text-muted-foreground">
          Category
        </label>
        <select
          id="applications-category-filter"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as "ALL" | JobCategory)
          }
        >
          <option value="ALL">All categories</option>
          {JOB_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {formatJobCategoryLabel(value)}
            </option>
          ))}
        </select>
        {categoryFilter !== "ALL" ? (
          <span className="text-xs text-muted-foreground">
            {visibleApplications.length} shown
          </span>
        ) : null}
      </div>

      {visibleApplications.map((application) => {
        const isExpanded = expandedId === application.id
        const detail = details[application.id]
        const rowClass = getApplicationRowClass(
          application.status,
          application.rejectionPhase,
        )
        const indicator = getStatusIndicator(application.status, application.rejectionPhase)

        return (
          <div
            key={application.id}
            className={cn(
              "group overflow-hidden rounded-xl border border-border/50 transition-all duration-500",
              isExpanded ? "shadow-lg" : "shadow-sm hover:shadow-md",
            )}
          >
            {/* Row View */}
            <button
              type="button"
              onClick={() => toggleExpand(application.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleExpand(application.id)
                }
              }}
              aria-expanded={isExpanded}
              aria-controls={`expanded-${application.id}`}
              className={cn(
                "flex w-full items-center gap-4 px-5 py-4 text-left transition-all duration-500",
                rowClass,
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              {/* Expand indicator */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/50 transition-transform duration-500">
                {isExpanded ? (
                  <ChevronDown className="size-4 text-foreground/70" />
                ) : (
                  <ChevronRight className="size-4 text-foreground/70" />
                )}
              </div>

              {/* Status indicator dot + text */}
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", indicator.color)}
                  aria-hidden="true"
                />
                <span className="sr-only">Status: {indicator.label}</span>
              </div>

              {/* Main content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="truncate font-medium text-foreground">
                    {application.title}
                  </h3>
                  {application.viaRecruiter && (
                    <UserRound
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-label="Via recruiter"
                    />
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-foreground/70">
                  {application.company}
                  {application.location && ` · ${application.location}`}
                </p>
              </div>

              {/* Badges and meta */}
              <div className="hidden items-center gap-3 md:flex">
                {application.hasCoverLetter && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-background/60 text-xs"
                  >
                    <FileText className="size-3" aria-hidden />
                    Letter
                  </Badge>
                )}
                {application.noteCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-background/60 text-xs"
                  >
                    <MessageSquare className="size-3" aria-hidden />
                    {application.noteCount}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-current/20 bg-background/50 font-medium"
                >
                  {indicator.label}
                </Badge>
              </div>

              {/* Applied date */}
              <div className="hidden text-right md:block">
                <p className="text-xs text-muted-foreground">
                  {application.appliedAt
                    ? application.appliedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Not applied"}
                </p>
              </div>

              {/* Full page link */}
              <Link
                href={`/dashboard/applications/${application.id}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg p-2 opacity-0 transition-opacity hover:bg-background/50 group-hover:opacity-100 focus:opacity-100"
                aria-label="View full application details"
              >
                <Maximize2 className="size-4 text-foreground/60" />
              </Link>
            </button>

            {/* Expanded Row View */}
            {isExpanded && (
              <div
                id={`expanded-${application.id}`}
                className={cn(
                  "animate-in fade-in slide-in-from-top-2 border-t border-border/30 px-5 py-6 duration-500",
                  rowClass.replace("text-", "").includes("bg-")
                    ? "bg-gradient-to-b from-transparent to-background/30"
                    : "",
                )}
              >
                {loadingId === application.id && !detail ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading details...
                  </div>
                ) : detail ? (
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Quick Actions */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Quick Actions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {!detail.rejectionPhase && (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-guava-green/90 text-white hover:bg-guava-green"
                              disabled={pending}
                              onClick={() => onNextStage(application.id, detail)}
                            >
                              Next Stage
                            </Button>
                          )}
                          {!detail.rejectionPhase ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                              disabled={pending}
                              onClick={() => onReject(application.id)}
                            >
                              Rejected
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => onClearRejection(application.id)}
                            >
                              Undo Rejection
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Change Status
                        </label>
                        <select
                          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                          value={detail.status}
                          disabled={pending || Boolean(detail.rejectionPhase)}
                          onChange={(e) =>
                            onStatusChange(
                              application.id,
                              e.target.value as (typeof PIPELINE_STATUS_OPTIONS)[number],
                            )
                          }
                        >
                          {PIPELINE_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {formatApplicationStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {detail.jobUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={detail.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Job Site
                              <ExternalLink className="ml-1.5 size-3" />
                            </a>
                          </Button>
                        )}
                        {detail.jobExternalId && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/jobs?job=${encodeURIComponent(detail.jobExternalId)}`}>
                              View Listing
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Middle Column - Key Details */}
                    <div className="space-y-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Details
                      </h4>
                      <dl className="grid gap-2 text-sm">
                        {detail.salaryText && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Salary</dt>
                            <dd className="font-medium">{detail.salaryText}</dd>
                          </div>
                        )}
                        {detail.industry && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Industry</dt>
                            <dd className="font-medium">{detail.industry}</dd>
                          </div>
                        )}
                        {detail.nextStep && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Next Step</dt>
                            <dd className="font-medium">{detail.nextStep}</dd>
                          </div>
                        )}
                        {detail.contactName && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Contact</dt>
                            <dd className="font-medium">{detail.contactName}</dd>
                          </div>
                        )}
                        {detail.fitScore && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Fit Score</dt>
                            <dd className="font-medium">{detail.fitScore}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Interview Section */}
                      {(showInterviewForm === application.id ||
                        detail.status === "INTERVIEW") &&
                        !detail.rejectionPhase && (
                          <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
                            <p className="mb-3 text-sm font-semibold">Interview Details</p>
                            <div className="grid gap-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs text-muted-foreground">
                                  Round
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    defaultValue={detail.interviewRound ?? 1}
                                    onChange={(e) =>
                                      setInterviewDrafts((prev) => ({
                                        ...prev,
                                        [application.id]: {
                                          ...prev[application.id],
                                          round: e.target.value,
                                          at: prev[application.id]?.at ?? "",
                                          location: prev[application.id]?.location ?? "",
                                          url: prev[application.id]?.url ?? "",
                                        },
                                      }))
                                    }
                                  />
                                </label>
                                <label className="text-xs text-muted-foreground">
                                  Date & Time
                                  <input
                                    type="datetime-local"
                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    defaultValue={
                                      detail.interviewScheduledAt
                                        ?.toISOString()
                                        .slice(0, 16) ?? ""
                                    }
                                    onChange={(e) =>
                                      setInterviewDrafts((prev) => ({
                                        ...prev,
                                        [application.id]: {
                                          ...prev[application.id],
                                          round: prev[application.id]?.round ?? "1",
                                          at: e.target.value,
                                          location: prev[application.id]?.location ?? "",
                                          url: prev[application.id]?.url ?? "",
                                        },
                                      }))
                                    }
                                  />
                                </label>
                              </div>
                              <label className="text-xs text-muted-foreground">
                                Location
                                <input
                                  type="text"
                                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  placeholder="Office address or city"
                                  defaultValue={detail.interviewLocation ?? ""}
                                  onChange={(e) =>
                                    setInterviewDrafts((prev) => ({
                                      ...prev,
                                      [application.id]: {
                                        ...prev[application.id],
                                        round: prev[application.id]?.round ?? "1",
                                        at: prev[application.id]?.at ?? "",
                                        location: e.target.value,
                                        url: prev[application.id]?.url ?? "",
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs text-muted-foreground">
                                Meeting URL
                                <input
                                  type="url"
                                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  placeholder="https://..."
                                  defaultValue={detail.interviewUrl ?? ""}
                                  onChange={(e) =>
                                    setInterviewDrafts((prev) => ({
                                      ...prev,
                                      [application.id]: {
                                        ...prev[application.id],
                                        round: prev[application.id]?.round ?? "1",
                                        at: prev[application.id]?.at ?? "",
                                        location: prev[application.id]?.location ?? "",
                                        url: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <Button
                                type="button"
                                size="sm"
                                disabled={pending}
                                onClick={() => onSaveInterview(application.id)}
                              >
                                Save Interview
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Right Column - Notes & Cover Letter */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cover Letter
                        </h4>
                        {application.coverLetterPreview ? (
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {application.coverLetterPreview}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No cover letter yet.
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Quick Note
                        </h4>
                        <textarea
                          rows={2}
                          placeholder="Add a note..."
                          value={noteDrafts[application.id] ?? ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [application.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          disabled={pending || !noteDrafts[application.id]?.trim()}
                          onClick={() => onAddNote(application.id)}
                        >
                          Add Note
                        </Button>
                      </div>

                      {/* View Full Button */}
                      <div className="pt-2">
                        <Button asChild className="w-full bg-guava-pink-gradient text-accent-foreground">
                          <Link href={`/dashboard/applications/${application.id}`}>
                            <Maximize2 className="mr-2 size-4" />
                            View in Full
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
