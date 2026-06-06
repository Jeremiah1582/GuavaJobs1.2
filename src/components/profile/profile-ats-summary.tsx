"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText, Loader2, UserRound } from "lucide-react"

import { ProgressRing } from "@/components/profile/progress-ring"
import { cn } from "@/lib/utils"

type ResumePayload = {
  resume?: {
    atsScore?: number
    grade?: string
    passesATS?: boolean
    filename?: string
  } | null
}

type ProfileAtsSummaryProps = {
  profileCompleteness: number
  hasCvFile: boolean
  variant?: "card" | "inline"
  className?: string
}

function useProfileAtsScore() {
  const [loading, setLoading] = useState(true)
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [grade, setGrade] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/resume")
      .then((r) => r.json())
      .then((data: ResumePayload) => {
        if (cancelled) return
        if (data.resume?.atsScore != null) {
          setAtsScore(data.resume.atsScore)
          setGrade(data.resume.grade ?? null)
          setFilename(data.resume.filename ?? null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { loading, atsScore, grade, filename }
}

export function ProfileAtsSummary({
  profileCompleteness,
  hasCvFile,
  variant = "card",
  className,
}: ProfileAtsSummaryProps) {
  const { loading, atsScore, grade, filename } = useProfileAtsScore()

  const fromCv = atsScore != null
  const score = fromCv ? atsScore! : profileCompleteness
  const sourceLabel = fromCv ? "Scored from your CV" : "Based on your profile"
  const SourceIcon = fromCv ? FileText : UserRound
  const ringVariant = fromCv ? "green" : "pink"
  const ringSize = variant === "inline" ? 72 : 52
  const strokeWidth = variant === "inline" ? 5 : 4

  const ring = (
    <div className="relative">
      <ProgressRing
        percent={loading ? 0 : score}
        size={ringSize}
        strokeWidth={strokeWidth}
        variant={ringVariant}
        label={fromCv ? "ATS" : "strength"}
        compact
        showLabel={false}
      />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : null}
    </div>
  )

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
        {ring}
        <p className="text-xs font-medium text-foreground">
          {fromCv ? "ATS score" : "Profile strength"}
        </p>
        {fromCv && grade ? (
          <p className="text-[10px] text-muted-foreground">Grade {grade}</p>
        ) : null}
        <p className="flex max-w-[7rem] items-center justify-center gap-1 text-[10px] leading-tight text-muted-foreground">
          <SourceIcon className="size-3 shrink-0" aria-hidden />
          <span className="line-clamp-2">{fromCv && filename ? filename : sourceLabel}</span>
        </p>
        <Link
          href="/dashboard/resume"
          className={cn(
            "text-[10px] font-medium hover:underline",
            fromCv ? "text-guava-green" : "text-guava-pink",
          )}
        >
          {fromCv ? "Full scan →" : hasCvFile ? "ATS scan →" : "Upload CV →"}
        </Link>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-border/60 bg-card p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {ring}
          <div>
            <p className="text-sm font-medium text-foreground">
              {fromCv ? "ATS score" : "Profile strength"}
              {fromCv && grade ? (
                <span className="ml-2 text-muted-foreground">· Grade {grade}</span>
              ) : null}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <SourceIcon className="size-3.5 shrink-0" aria-hidden />
              {sourceLabel}
              {fromCv && filename ? ` · ${filename}` : null}
            </p>
          </div>
        </div>
        {!fromCv ? (
          <Link
            href="/dashboard/resume"
            className="text-xs font-medium text-guava-pink hover:underline"
          >
            {hasCvFile ? "Run CV ATS scan →" : "Upload CV for ATS score →"}
          </Link>
        ) : (
          <Link href="/dashboard/resume" className="text-xs font-medium text-guava-green hover:underline">
            View full scan →
          </Link>
        )}
      </div>
    </div>
  )
}
