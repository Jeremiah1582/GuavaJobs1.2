"use client"

import { useTransition } from "react"
import {
  PIPELINE_STATUS_OPTIONS,
  formatApplicationStatusLabel,
} from "@/lib/applications"

import {
  updateApplicationStatusAction,
  type PipelineStatus,
} from "@/lib/applications/actions"
import { toast } from "sonner"

type ApplicationStatusFormProps = {
  applicationId: string
  currentStatus: string
}

export function ApplicationStatusForm({
  applicationId,
  currentStatus,
}: ApplicationStatusFormProps) {
  const [pending, startTransition] = useTransition()

  const pipelineStatus = PIPELINE_STATUS_OPTIONS.includes(
    currentStatus as PipelineStatus,
  )
    ? (currentStatus as PipelineStatus)
    : "WAITING"

  return (
    <select
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      value={pipelineStatus}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as PipelineStatus
        startTransition(async () => {
          try {
            await updateApplicationStatusAction(applicationId, status)
            toast.success("Status updated")
          } catch {
            toast.error("Could not update status")
          }
        })
      }}
    >
      {PIPELINE_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {formatApplicationStatusLabel(s)}
        </option>
      ))}
    </select>
  )
}
