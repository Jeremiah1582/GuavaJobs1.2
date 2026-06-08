"use client"

import { useState } from "react"

import { ApplicationsTable } from "@/components/applications/applications-table"
import { ApplicationTracker } from "@/components/dashboard/application-tracker"
import type { ApplicationListItem } from "@/lib/applications"
import {
  filterApplicationsByStage,
  type PipelineStageFilter,
} from "@/lib/dashboard/pipeline-stats"

type ApplicationsListViewProps = {
  applications: ApplicationListItem[]
  initialStage?: PipelineStageFilter
}

export function ApplicationsListView({
  applications,
  initialStage = "ALL",
}: ApplicationsListViewProps) {
  const [stageFilter, setStageFilter] = useState<PipelineStageFilter>(initialStage)
  const filtered = filterApplicationsByStage(applications, stageFilter)

  return (
    <div className="space-y-4">
      <ApplicationTracker
        applications={applications}
        variant="full"
        activeStage={stageFilter}
        onStageFilter={setStageFilter}
      />
      {filtered.length > 0 ? (
        <ApplicationsTable applications={filtered} />
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No applications in this stage.{" "}
          <button
            type="button"
            onClick={() => setStageFilter("ALL")}
            className="font-medium text-guava-pink hover:underline"
          >
            Show all
          </button>
        </p>
      )}
    </div>
  )
}
