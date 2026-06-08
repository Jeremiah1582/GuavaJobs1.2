"use client"

/**
 * @deprecated Superseded by IcpFitPanel — keyword + fit UI lives in the match-first ICP panel.
 */
import { useCallback, useEffect, useState, useTransition } from "react"
import { Loader2, RefreshCw, Target } from "lucide-react"
import { apiErrorMessage, parseApiResponse } from "@/lib/parse-api-response"
import type { ApplicationAtsReportDto } from "@/lib/applications/ats/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ApplicationAtsPanelProps = {
  applicationId: string
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong"
  if (score >= 50) return "Fair"
  return "Weak"
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
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

export function ApplicationAtsPanel({ applicationId }: ApplicationAtsPanelProps) {
  const [report, setReport] = useState<ApplicationAtsReportDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshPending, startRefresh] = useTransition()

  const loadReport = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/ats`)
      const data = await parseApiResponse<{ report?: ApplicationAtsReportDto; error?: string }>(res)
      if (!res.ok) {
        if (res.status === 404) {
          setReport(null)
          return
        }
        throw new Error(apiErrorMessage(data) ?? "Could not load application fit score.")
      }
      setReport(data.report ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load application fit score.")
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
        const data = await parseApiResponse<{ report?: ApplicationAtsReportDto; error?: string }>(res)
        if (!res.ok) {
          throw new Error(apiErrorMessage(data) ?? "Could not refresh ATS score.")
        }
        setReport(data.report ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh ATS score.")
      }
    })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="size-4" aria-hidden />
          Application fit
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onRefresh}
          disabled={refreshPending || loading}
        >
          {refreshPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh ATS
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analyzing job requirements…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !report ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No fit score yet. Add a job description or refresh once the application is saved.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshPending}>
              Analyze now
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Overall application strength</p>
                <p className={cn("text-3xl font-semibold tabular-nums", scoreColor(report.overallScore))}>
                  {report.overallScore}%
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {scoreLabel(report.overallScore)}
                </p>
              </div>
              <dl className="grid gap-2 text-right text-xs">
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
            </div>

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

            {report.tips.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Guidance</p>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {report.tips.map((tip) => (
                    <li key={tip} className="leading-relaxed">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
