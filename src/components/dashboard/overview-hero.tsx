import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DashboardPipelineStats } from "@/lib/dashboard/pipeline-stats"
import type { GettingStartedState } from "@/lib/dashboard/getting-started"
import type { ProfileCompleteness } from "@/lib/profile"
import { cn } from "@/lib/utils"

type OverviewHeroProps = {
  displayName?: string
  gettingStarted: GettingStartedState
  stats: DashboardPipelineStats
  completeness: ProfileCompleteness
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getFocusHint(state: GettingStartedState): string {
  if (state.allComplete) {
    return "Your pipeline is live — keep momentum on roles in flight."
  }
  const current = state.steps.find((step) => step.current)
  if (current?.number === 1) return "Add your CV or profile link to unlock matched roles."
  if (current?.number === 2) return "Track a listing to open your first application."
  if (current?.number === 3) return "Generate your cover letter and you're ready to submit."
  return "Three steps to your first polished application."
}

function ProfileCompletionRing({
  percent,
  onDark,
}: {
  percent: number
  onDark: boolean
}) {
  const size = 76
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const complete = percent >= 100

  return (
    <Link
      href="/dashboard/profile"
      className="group flex shrink-0 flex-col items-center gap-1.5 transition-transform hover:scale-[1.02]"
      aria-label={`Profile ${percent}% complete — open profile`}
    >
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={5}
            className={onDark ? "stroke-white/25" : "stroke-black/10"}
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
            className={cn(
              "transition-all duration-700 ease-out",
              complete ? "stroke-white" : onDark ? "stroke-white" : "stroke-guava-green",
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-lg font-bold tabular-nums leading-none",
              onDark ? "text-white" : "text-foreground",
            )}
          >
            {percent}
          </span>
          <span
            className={cn(
              "mt-0.5 text-[9px] font-semibold uppercase tracking-wide",
              onDark ? "text-white/75" : "text-muted-foreground",
            )}
          >
            Profile
          </span>
        </div>
      </div>
      {!complete ? (
        <span
          className={cn(
            "text-[10px] font-medium",
            onDark ? "text-white/80 group-hover:text-white" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          Level up →
        </span>
      ) : null}
    </Link>
  )
}

export function OverviewHero({
  displayName,
  gettingStarted,
  stats,
  completeness,
}: OverviewHeroProps) {
  const firstName = displayName?.split(/\s+/)[0]
  const greeting = getTimeGreeting()
  const isReady = gettingStarted.allComplete

  return (
    <section aria-labelledby="dashboard-hero-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:gap-6">
        <div
          className={cn(
            "inline-block w-full rounded-2xl p-6 shadow-md md:p-8",
            "lg:w-auto lg:min-w-[min(100%,20rem)] lg:max-w-md",
            isReady
              ? "bg-guava-green-gradient text-white"
              : "bg-guava-pink-gradient text-accent-foreground",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <p
                className={cn(
                  "text-xs font-medium uppercase tracking-[0.2em]",
                  isReady ? "text-white/80" : "text-accent-foreground/80",
                )}
              >
                {isReady ? "Command center" : `Step ${gettingStarted.currentStep ?? 1} of 3`}
              </p>
              <h1
                id="dashboard-hero-heading"
                className="text-2xl font-semibold tracking-tight text-balance md:text-3xl"
              >
                {firstName ? `${greeting}, ${firstName}` : greeting}
              </h1>
              <p
                className={cn(
                  "max-w-sm text-sm leading-relaxed md:text-base",
                  isReady ? "text-white/85" : "text-accent-foreground/85",
                )}
              >
                {getFocusHint(gettingStarted)}
              </p>
            </div>
            <ProfileCompletionRing percent={completeness.percent} onDark />
          </div>

          <div className="mt-6">
            {isReady ? (
              <Button
                asChild
                size="sm"
                className="gap-1 bg-white text-guava-green-dark hover:bg-white/90"
              >
                <Link href="/dashboard/jobs">
                  Browse {stats.jobMatches > 0 ? `${stats.jobMatches} matches` : "job matches"}
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="gap-1 bg-white/95 text-guava-pink-dark hover:bg-white"
              >
                <Link href={gettingStarted.steps.find((s) => s.current)?.href ?? "/dashboard/profile"}>
                  Continue setup
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </div>

      </div>
    </section>
  )
}
