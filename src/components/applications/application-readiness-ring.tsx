"use client"

import Link from "next/link"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import type { ApplicationReadiness, ReadinessItemStatus } from "@/lib/applications/readiness"
import { cn } from "@/lib/utils"

type ApplicationReadinessRingProps = {
  readiness: ApplicationReadiness
  compact?: boolean
}

function ringColor(score: number): string {
  if (score >= 75) return "stroke-emerald-500"
  if (score >= 50) return "stroke-amber-500"
  return "stroke-red-500"
}

function StatusIcon({ status }: { status: ReadinessItemStatus }) {
  if (status === "good") {
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
  }
  if (status === "weak") {
    return <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
  }
  return <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

export function ApplicationReadinessRing({
  readiness,
  compact = false,
}: ApplicationReadinessRingProps) {
  const size = compact ? 64 : 80
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (readiness.score / 100) * circumference

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
      <div
        className={cn(
          "flex gap-4",
          compact ? "items-center" : "flex-col sm:flex-row sm:items-center",
        )}
      >
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="rotate-[-90deg]"
            aria-hidden
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={5}
              className="stroke-muted"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn("transition-all duration-500", ringColor(readiness.score))}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums leading-none">
              {readiness.score}
            </span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              %
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{readiness.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{readiness.summary}</p>
        </div>
      </div>

      <div className="border-t border-border/50 pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Score based on
        </p>
        <ul className="space-y-1.5" aria-label="Submission readiness factors">
          {readiness.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-xs leading-snug">
              <StatusIcon status={item.status} />
              <span className="min-w-0">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {readiness.score < 85 && (
        <p className="text-[11px] text-muted-foreground">
          <Link href="/dashboard/profile" className="underline hover:text-foreground">
            Profile
          </Link>
          {" · "}
          <a href="#application-match" className="underline hover:text-foreground">
            Match panel
          </a>
          {" "}to improve scores
        </p>
      )}
    </div>
  )
}
