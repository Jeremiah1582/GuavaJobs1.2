"use client"

import Link from "next/link"
import type { ApplicationListItem } from "@/lib/applications"
import {
  formatApplicationStatusLabel,
  getApplicationRowClass,
} from "@/lib/applications"
import {
  computeStageCounts,
  type PipelineStageFilter,
} from "@/lib/dashboard/pipeline-stats"
import { cn } from "@/lib/utils"

type StageChip = {
  id: PipelineStageFilter
  label: string
  count: number
  rowClass: string
}

type ApplicationTrackerProps = {
  applications: ApplicationListItem[]
  variant: "compact" | "full"
  activeStage?: PipelineStageFilter
  onStageFilter?: (stage: PipelineStageFilter) => void
}

function buildStageChips(applications: ApplicationListItem[]): StageChip[] {
  const counts = computeStageCounts(applications)

  const pipelineStages: StageChip[] = [
    {
      id: "DRAFT",
      label: "Draft",
      count: counts.DRAFT,
      rowClass: getApplicationRowClass("DRAFT"),
    },
    {
      id: "APPLIED",
      label: "Applied",
      count: counts.APPLIED,
      rowClass: getApplicationRowClass("APPLIED"),
    },
    {
      id: "WAITING",
      label: "Waiting",
      count: counts.WAITING,
      rowClass: getApplicationRowClass("WAITING"),
    },
    {
      id: "INTERVIEW",
      label: "Interview",
      count: counts.INTERVIEW,
      rowClass: getApplicationRowClass("INTERVIEW"),
    },
    {
      id: "OFFER",
      label: "Offer",
      count: counts.OFFER + counts.ACCEPTED,
      rowClass: getApplicationRowClass("OFFER"),
    },
    {
      id: "REJECTED",
      label: "Rejected",
      count: counts.rejected,
      rowClass: getApplicationRowClass("APPLIED", "PRE_INTERVIEW"),
    },
  ]

  return pipelineStages
}

function StagePill({
  chip,
  active,
  onClick,
  href,
  compact,
}: {
  chip: StageChip
  active: boolean
  onClick?: () => void
  href?: string
  compact: boolean
}) {
  const className = cn(
    "flex min-w-[4.5rem] flex-col items-center rounded-xl border border-border/50 px-3 py-2.5 transition-all",
    chip.rowClass,
    active && "ring-2 ring-guava-pink/40 ring-offset-2 ring-offset-background",
    compact ? "hover:opacity-90" : "cursor-pointer hover:shadow-sm",
  )

  const content = (
    <>
      <span className="text-xl font-semibold tabular-nums leading-none">{chip.count}</span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
        {chip.label}
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`${chip.label}: ${chip.count}`}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-pressed={active}
      aria-label={`${chip.label}: ${chip.count}`}
    >
      {content}
    </button>
  )
}

export function ApplicationTracker({
  applications,
  variant,
  activeStage = "ALL",
  onStageFilter,
}: ApplicationTrackerProps) {
  if (applications.length === 0) return null

  const chips = buildStageChips(applications)
  const counts = computeStageCounts(applications)

  if (variant === "compact") {
    return (
      <section aria-labelledby="pipeline-compact-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="pipeline-compact-heading" className="text-lg font-semibold tracking-tight">
              Pipeline
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.total} application{counts.total === 1 ? "" : "s"} tracked
            </p>
          </div>
          <Link
            href="/dashboard/applications"
            className="text-sm font-medium text-guava-pink hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <StagePill
              key={chip.id}
              chip={chip}
              active={false}
              compact
              href={
                chip.count > 0
                  ? `/dashboard/applications?stage=${chip.id}`
                  : "/dashboard/applications"
              }
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="pipeline-full-heading" className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="pipeline-full-heading" className="text-sm font-semibold text-foreground">
            Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeStage === "ALL"
              ? "Click a stage to filter the list below"
              : `Showing ${activeStage === "REJECTED" ? "rejected" : activeStage === "OFFER" ? "offer" : formatApplicationStatusLabel(activeStage).toLowerCase()} applications`}
          </p>
        </div>
        {activeStage !== "ALL" ? (
          <button
            type="button"
            onClick={() => onStageFilter?.("ALL")}
            className="text-xs font-medium text-guava-pink hover:underline"
          >
            Clear filter
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <StagePill
          chip={{
            id: "ALL",
            label: "All",
            count: counts.total,
            rowClass: "bg-muted/60 text-foreground",
          }}
          active={activeStage === "ALL"}
          compact={false}
          onClick={() => onStageFilter?.("ALL")}
        />
        {chips.map((chip) => (
          <StagePill
            key={chip.id}
            chip={chip}
            active={activeStage === chip.id}
            compact={false}
            onClick={() => onStageFilter?.(chip.id)}
          />
        ))}
      </div>
    </section>
  )
}
