"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react"
import { apiErrorMessage, parseApiResponse } from "@/lib/parse-api-response"
import type { ApplicationAtsReportDto } from "@/lib/applications/ats/types"
import type { DimensionMatch, MatchStatus } from "@/lib/applications/job-insights/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type IcpFitPanelProps = {
  applicationId: string
  hasJobDescription?: boolean
}

type AtsApiPayload = {
  report?: ApplicationAtsReportDto
  icp?: ApplicationAtsReportDto["icp"]
  icpMatch?: ApplicationAtsReportDto["icpMatch"]
  error?: string
}

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; dot: string; text: string; subtext: string }
> = {
  met: {
    label: "Strong ICP match",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    subtext: "You meet most of what they're looking for",
  },
  partial: {
    label: "Partial ICP match",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    subtext: "Some gaps — worth addressing before you apply",
  },
  missing: {
    label: "Weak ICP match",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    subtext: "Several must-haves are missing from your profile",
  },
}

function StatusDot({ status, className }: { status: MatchStatus; className?: string }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn("inline-block size-3 shrink-0 rounded-full", config.dot, className)}
      aria-hidden
    />
  )
}

function ScoreBar({ score, status }: { score: number; status: MatchStatus }) {
  const barColor =
    status === "met"
      ? "bg-emerald-500"
      : status === "partial"
        ? "bg-amber-500"
        : "bg-red-500"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  )
}

function ChipList({
  items,
  variant,
}: {
  items: string[]
  variant: "met" | "partial" | "missing"
}) {
  if (items.length === 0) return null
  const styles = {
    met: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    partial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    missing: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={`${variant}-${item}`}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
            styles[variant],
          )}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function DimensionRow({
  name,
  dimension,
}: {
  name: string
  dimension: DimensionMatch
}) {
  const [open, setOpen] = useState(false)
  const hasDetail =
    dimension.met.length > 0 ||
    dimension.partial.length > 0 ||
    dimension.missing.length > 0 ||
    Boolean(dimension.gap)

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
        onClick={() => hasDetail && setOpen((v) => !v)}
        disabled={!hasDetail}
        aria-expanded={open}
      >
        <StatusDot status={dimension.status} />
        <span className="min-w-0 flex-1 text-sm font-medium">{name}</span>
        <span className="text-sm font-semibold tabular-nums">{dimension.score}%</span>
        {hasDetail ? (
          open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )
        ) : null}
      </button>
      <div className="px-3 pb-2">
        <ScoreBar score={dimension.score} status={dimension.status} />
      </div>
      {open && hasDetail && (
        <div className="space-y-2 border-t border-border/40 px-3 py-3">
          <ChipList items={dimension.met} variant="met" />
          <ChipList items={dimension.partial} variant="partial" />
          <ChipList items={dimension.missing} variant="missing" />
          {dimension.gap && (
            <p className="text-xs text-muted-foreground">{dimension.gap}</p>
          )}
        </div>
      )}
    </div>
  )
}

function KeywordChips({
  title,
  present,
  missing,
}: {
  title: string
  present: string[]
  missing: string[]
}) {
  if (present.length === 0 && missing.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {present.map((keyword) => (
          <span
            key={`present-${keyword}`}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
          >
            {keyword}
          </span>
        ))}
        {missing.map((keyword) => (
          <span
            key={`missing-${keyword}`}
            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  )
}

export function IcpFitPanel({
  applicationId,
  hasJobDescription = false,
}: IcpFitPanelProps) {
  const router = useRouter()
  const [report, setReport] = useState<ApplicationAtsReportDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"icp" | "fit">("fit")
  const [jdDraft, setJdDraft] = useState("")
  const [savePending, startSave] = useTransition()
  const [refreshPending, startRefresh] = useTransition()
  const [channelsOpen, setChannelsOpen] = useState(false)

  const loadReport = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/ats`)
      const data = await parseApiResponse<AtsApiPayload>(res)
      if (!res.ok) {
        if (res.status === 404) {
          setReport(null)
          return
        }
        throw new Error(apiErrorMessage(data) ?? "Could not load match score.")
      }
      setReport(data.report ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ICP fit score.")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  function onRefresh() {
    startRefresh(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/applications/${applicationId}/ats/recompute`, {
          method: "POST",
        })
        const data = await parseApiResponse<AtsApiPayload>(res)
        if (!res.ok) {
          throw new Error(apiErrorMessage(data) ?? "Could not analyze your match.")
        }
        setReport(data.report ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not analyze ICP fit.")
      }
    })
  }

  function onSaveAndAnalyze() {
    const text = jdDraft.trim()
    if (!text) return
    startSave(async () => {
      setError(null)
      try {
        const patchRes = await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: text }),
        })
        const patchData = await parseApiResponse<{ error?: string }>(patchRes)
        if (!patchRes.ok) {
          throw new Error(apiErrorMessage(patchData) ?? "Could not save job description.")
        }
        const analyzeRes = await fetch(`/api/applications/${applicationId}/ats/recompute`, {
          method: "POST",
        })
        const analyzeData = await parseApiResponse<AtsApiPayload>(analyzeRes)
        if (!analyzeRes.ok) {
          throw new Error(apiErrorMessage(analyzeData) ?? "Could not analyze your match.")
        }
        setReport(analyzeData.report ?? null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save job description.")
      }
    })
  }

  const status = report?.overallStatus ?? report?.icpMatch?.overallStatus ?? "partial"
  const statusConfig = STATUS_CONFIG[status]
  const icp = report?.icp
  const icpMatch = report?.icpMatch

  return (
    <section id="application-match" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="size-4" aria-hidden />
          How you match
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onRefresh}
          disabled={refreshPending || loading || savePending}
        >
          {refreshPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          {report ? "Refresh" : "Analyze"}
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="size-4 animate-pulse rounded-full bg-muted" />
              <span className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !report ? (
          <div className="space-y-3">
            {hasJobDescription ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Job description is on file. Run analysis to see how your profile and documents
                  match what this employer is looking for.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={onRefresh}
                  disabled={refreshPending}
                >
                  {refreshPending ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                      Analyzing…
                    </>
                  ) : (
                    "Analyze my match"
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Add a job description first — paste it below or in the Job description section —
                  then we&apos;ll score your fit.
                </p>
                <textarea
                  value={jdDraft}
                  onChange={(e) => setJdDraft(e.target.value)}
                  placeholder="Paste job description here…"
                  rows={6}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={onSaveAndAnalyze}
                  disabled={savePending || !jdDraft.trim()}
                >
                  {savePending ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    "Save & analyze"
                  )}
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <StatusDot status={status} className="mt-1.5 size-4" />
                  <div>
                    <p className={cn("text-lg font-semibold", statusConfig.text)}>
                      {statusConfig.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{statusConfig.subtext}</p>
                  </div>
                </div>
                <p className={cn("text-3xl font-semibold tabular-nums", statusConfig.text)}>
                  {report.overallScore}%
                </p>
              </div>
            </div>

            {report.tips.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">What to improve</p>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {report.tips.map((tip) => (
                    <li key={tip} className="leading-relaxed">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {(
                [
                  ["fit", "Your match"],
                  ["icp", "What they want"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "icp" && icp && (
              <div className="space-y-4 text-sm">
                <p className="text-xs text-muted-foreground">
                  Shared insight for this role
                </p>
                {icp.roleSummary && (
                  <p className="leading-relaxed text-foreground">{icp.roleSummary}</p>
                )}
                {icp.mustHaveSkills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Must-have skills
                    </p>
                    <ChipList items={icp.mustHaveSkills} variant="met" />
                  </div>
                )}
                {icp.niceToHaveSkills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Nice-to-have skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {icp.niceToHaveSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(icp.experience.domains.length > 0 ||
                  icp.experience.evidencePhrases.length > 0) && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Experience</p>
                    <ChipList
                      items={[...icp.experience.domains, ...icp.experience.evidencePhrases]}
                      variant="partial"
                    />
                  </div>
                )}
                {(icp.education.levels.length > 0 || icp.education.fields.length > 0) && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Education</p>
                    <ChipList
                      items={[...icp.education.levels, ...icp.education.fields]}
                      variant="partial"
                    />
                  </div>
                )}
                {icp.qualifications.length > 0 && (
                  <ChipList items={icp.qualifications} variant="partial" />
                )}
                {icp.softTraits.length > 0 && (
                  <ChipList items={icp.softTraits} variant="partial" />
                )}
                {icp.cvEmphasis.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">CV emphasis</p>
                    <ul className="space-y-1 text-xs">
                      {icp.cvEmphasis.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {icp.coverLetterThemes.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Cover letter themes
                    </p>
                    <ul className="space-y-1 text-xs">
                      {icp.coverLetterThemes.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === "fit" && (
              <div className="space-y-3">
                {icpMatch ? (
                  <>
                    <DimensionRow name="Skills" dimension={icpMatch.dimensions.skills} />
                    <DimensionRow name="Experience" dimension={icpMatch.dimensions.experience} />
                    <DimensionRow name="Education" dimension={icpMatch.dimensions.education} />
                    <DimensionRow name="Seniority" dimension={icpMatch.dimensions.seniority} />
                    <DimensionRow
                      name="Qualifications"
                      dimension={icpMatch.dimensions.qualifications}
                    />

                    {icpMatch.topGaps.length > 0 && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <p className="mb-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                          Top gaps
                        </p>
                        <ul className="space-y-1 text-xs text-foreground">
                          {icpMatch.topGaps.map((gap) => (
                            <li key={gap}>• {gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {icpMatch.topStrengths.length > 0 && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="mb-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Top strengths
                        </p>
                        <ul className="space-y-1 text-xs text-foreground">
                          {icpMatch.topStrengths.map((s) => (
                            <li key={s}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Profile dimension scores are not available yet. Refresh your profile snapshot,
                    then analyze again.
                  </p>
                )}

                <KeywordChips
                  title="Cover letter keywords"
                  present={report.letterMatch.present}
                  missing={report.letterMatch.missing}
                />
                <KeywordChips
                  title="CV keywords"
                  present={report.cvMatch.present}
                  missing={report.cvMatch.missing}
                />

                <p className="text-xs text-muted-foreground">
                  <Link href="/dashboard/profile" className="underline hover:text-foreground">
                    Refresh profile snapshot
                  </Link>{" "}
                  after editing your profile, then re-analyze.
                </p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground"
                onClick={() => setChannelsOpen((v) => !v)}
              >
                {channelsOpen ? (
                  <ChevronDown className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
                Document channels (cover letter + CV keywords)
              </button>
              {channelsOpen && (
                <div className="mt-3 space-y-3">
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Cover letter</dt>
                      <dd className="font-semibold tabular-nums">
                        {report.letterScore !== null ? `${report.letterScore}%` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">CV</dt>
                      <dd className="font-semibold tabular-nums">
                        {report.cvScore !== null ? `${report.cvScore}%` : "—"}
                      </dd>
                    </div>
                  </dl>
                  <KeywordChips
                    title="Cover letter keywords"
                    present={report.letterMatch.present}
                    missing={report.letterMatch.missing}
                  />
                  <KeywordChips
                    title="CV keywords"
                    present={report.cvMatch.present}
                    missing={report.cvMatch.missing}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
