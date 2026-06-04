"use client"

import { useCallback, useState, useTransition } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  addApplicationNoteAction,
  advanceApplicationStageAction,
  clearApplicationRejectionAction,
  getApplicationDetailAction,
  rejectApplicationAction,
  setInterviewDetailsAction,
  updateApplicationFieldsAction,
  updateApplicationStatusAction,
} from "@/lib/applications/actions"
import { toast } from "sonner"

type ApplicationTrackerProps = {
  applications: ApplicationListItem[]
}

function statusLabel(
  app: ApplicationListItem | ApplicationDetail,
): string {
  if (app.rejectionPhase) return "Rejected"
  return formatApplicationStatusLabel(app.status)
}

export function ApplicationTracker({ applications }: ApplicationTrackerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, ApplicationDetail>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [showAllNotes, setShowAllNotes] = useState<Record<string, boolean>>({})
  const [interviewDrafts, setInterviewDrafts] = useState<
    Record<
      string,
      {
        round: string
        at: string
        location: string
        url: string
      }
    >
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
        <label htmlFor="tracker-category-filter" className="text-xs text-muted-foreground">
          Category
        </label>
        <select
          id="tracker-category-filter"
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

      <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto_auto] md:gap-3">
        <span>Role</span>
        <span>Company</span>
        <span>Location</span>
        <span>Source</span>
        <span>Applied</span>
        <span>Status</span>
      </div>

      <ul className="divide-y divide-border">
        {visibleApplications.map((application) => {
          const isExpanded = expandedId === application.id
          const detail = details[application.id]
          const showAll = showAllNotes[application.id]
          const visibleNotes = detail
            ? showAll
              ? detail.notes
              : detail.notes.slice(0, 3)
            : []
          const rowClass = getApplicationRowClass(
            application.status,
            application.rejectionPhase,
          )

          return (
            <li key={application.id}>
              <button
                type="button"
                onClick={() => toggleExpand(application.id)}
                className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:opacity-95 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto_auto] md:items-center md:gap-3 ${rowClass}`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  {isExpanded ? (
                    <ChevronDown className="mt-0.5 size-4 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-70" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{application.title}</p>
                    <p className="text-sm opacity-80 md:hidden">{application.company}</p>
                  </div>
                </div>
                <p className="hidden truncate text-sm md:block">{application.company}</p>
                <p className="hidden truncate text-sm md:block">
                  {application.location ?? "—"}
                </p>
                <p className="hidden truncate text-sm md:block">
                  {application.source ?? "—"}
                </p>
                <time
                  className="hidden text-sm md:block"
                  dateTime={application.appliedAt?.toISOString()}
                >
                  {application.appliedAt
                    ? application.appliedAt.toLocaleDateString("en-GB")
                    : "—"}
                </time>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="w-fit border-current/30 bg-background/40">
                    {statusLabel(application)}
                  </Badge>
                  {application.coverLetterPreview ? (
                    <Badge variant="secondary" className="w-fit text-xs">
                      Letter
                    </Badge>
                  ) : null}
                  {application.viaRecruiter ? (
                    <UserRound className="size-4 opacity-70" aria-label="Via recruiter" />
                  ) : null}
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-border bg-muted/20 px-4 py-4 md:px-8">
                  {loadingId === application.id && !detail ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading details…
                    </div>
                  ) : detail ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap gap-2">
                        {!detail.rejectionPhase ? (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-guava-green/90 text-white hover:bg-guava-green"
                            disabled={pending}
                            onClick={() => onNextStage(application.id, detail)}
                          >
                            Next stage
                          </Button>
                        ) : null}
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
                            Undo rejection
                          </Button>
                        )}
                        {detail.jobUrl ? (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={detail.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Job site
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                        ) : null}
                        {detail.jobExternalId ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/jobs?job=${encodeURIComponent(detail.jobExternalId)}`}
                            >
                              View listing
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/applications/${application.id}`}>
                            Full page
                          </Link>
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                          Status
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
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
                        </label>
                      </div>

                      {(showInterviewForm === application.id ||
                        detail.status === "INTERVIEW") && !detail.rejectionPhase ? (
                        <div className="rounded-lg border border-border bg-background p-4">
                          <p className="text-sm font-medium">Interview details</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="text-xs text-muted-foreground">
                              Round (1–5)
                              <input
                                type="number"
                                min={1}
                                max={5}
                                className="mt-1 flex h-9 w-full rounded-md border border-input px-2 text-sm"
                                defaultValue={
                                  detail.interviewRound ??
                                  interviewDrafts[application.id]?.round ??
                                  "1"
                                }
                                onChange={(e) =>
                                  setInterviewDrafts((prev) => ({
                                    ...prev,
                                    [application.id]: {
                                      round: e.target.value,
                                      at:
                                        prev[application.id]?.at ??
                                        detail.interviewScheduledAt
                                          ?.toISOString()
                                          .slice(0, 16) ??
                                        "",
                                      location:
                                        prev[application.id]?.location ??
                                        detail.interviewLocation ??
                                        "",
                                      url:
                                        prev[application.id]?.url ??
                                        detail.interviewUrl ??
                                        "",
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label className="text-xs text-muted-foreground">
                              Date & time
                              <input
                                type="datetime-local"
                                className="mt-1 flex h-9 w-full rounded-md border border-input px-2 text-sm"
                                defaultValue={
                                  detail.interviewScheduledAt
                                    ?.toISOString()
                                    .slice(0, 16) ??
                                  interviewDrafts[application.id]?.at ??
                                  ""
                                }
                                onChange={(e) =>
                                  setInterviewDrafts((prev) => ({
                                    ...prev,
                                    [application.id]: {
                                      round:
                                        prev[application.id]?.round ??
                                        String(detail.interviewRound ?? 1),
                                      at: e.target.value,
                                      location: prev[application.id]?.location ?? "",
                                      url: prev[application.id]?.url ?? "",
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label className="text-xs text-muted-foreground sm:col-span-2">
                              Location
                              <input
                                type="text"
                                className="mt-1 flex h-9 w-full rounded-md border border-input px-2 text-sm"
                                placeholder="Office address or city"
                                defaultValue={detail.interviewLocation ?? ""}
                                onChange={(e) =>
                                  setInterviewDrafts((prev) => ({
                                    ...prev,
                                    [application.id]: {
                                      round:
                                        prev[application.id]?.round ??
                                        String(detail.interviewRound ?? 1),
                                      at: prev[application.id]?.at ?? "",
                                      location: e.target.value,
                                      url: prev[application.id]?.url ?? "",
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label className="text-xs text-muted-foreground sm:col-span-2">
                              Video / calendar URL
                              <input
                                type="url"
                                className="mt-1 flex h-9 w-full rounded-md border border-input px-2 text-sm"
                                placeholder="https://…"
                                defaultValue={detail.interviewUrl ?? ""}
                                onChange={(e) =>
                                  setInterviewDrafts((prev) => ({
                                    ...prev,
                                    [application.id]: {
                                      round:
                                        prev[application.id]?.round ??
                                        String(detail.interviewRound ?? 1),
                                      at: prev[application.id]?.at ?? "",
                                      location: prev[application.id]?.location ?? "",
                                      url: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3"
                            disabled={pending}
                            onClick={() => onSaveInterview(application.id)}
                          >
                            Save interview
                          </Button>
                        </div>
                      ) : null}

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        {detail.salaryText ? (
                          <p>
                            <span className="text-muted-foreground">Salary: </span>
                            {detail.salaryText}
                          </p>
                        ) : null}
                        {detail.nextStep ? (
                          <p>
                            <span className="text-muted-foreground">Next step: </span>
                            {detail.nextStep}
                          </p>
                        ) : null}
                        {detail.fitScore ? (
                          <p>
                            <span className="text-muted-foreground">Fit: </span>
                            {detail.fitScore}
                          </p>
                        ) : null}
                        {detail.industry ? (
                          <p>
                            <span className="text-muted-foreground">Industry: </span>
                            {detail.industry}
                          </p>
                        ) : null}
                        {detail.contactName ? (
                          <p>
                            <span className="text-muted-foreground">Contact: </span>
                            {detail.contactName}
                          </p>
                        ) : null}
                      </div>

                      {detail.requirementsNotes ? (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Requirements:{" "}
                          </span>
                          {detail.requirementsNotes}
                        </p>
                      ) : null}
                      {detail.aboutNotes ? (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          <span className="font-medium text-foreground">About: </span>
                          {detail.aboutNotes}
                        </p>
                      ) : null}

                      <div>
                        <p className="text-sm font-medium text-foreground">Cover letter</p>
                        {application.coverLetterPreview ? (
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {application.coverLetterPreview}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            No cover letter saved yet.
                          </p>
                        )}
                        <Link
                          href={`/applications/${application.id}`}
                          className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
                        >
                          {application.coverLetterPreview ? "Edit letter" : "Write cover letter"}
                        </Link>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground">Notes</p>
                        {visibleNotes.length === 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Add interview prep, recruiter details, follow-up dates…
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {visibleNotes.map((note) => (
                              <li
                                key={note.id}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              >
                                <p className="whitespace-pre-wrap">{note.body}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                        {detail.notes.length > 3 ? (
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-accent hover:underline"
                            onClick={() =>
                              setShowAllNotes((prev) => ({
                                ...prev,
                                [application.id]: !prev[application.id],
                              }))
                            }
                          >
                            {showAllNotes[application.id]
                              ? "Show fewer notes"
                              : `Show ${detail.notes.length - 3} older notes`}
                          </button>
                        ) : null}
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={3}
                            placeholder="Add a note…"
                            value={noteDrafts[application.id] ?? ""}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [application.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending || !noteDrafts[application.id]?.trim()}
                            onClick={() => onAddNote(application.id)}
                          >
                            Save note
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      </div>
    </div>
  )
}
