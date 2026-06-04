"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import type { ApplicationProfileSnapshotDto } from "@/lib/applications"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { refreshApplicationProfileSnapshotAction } from "@/lib/applications/actions"

type ProfileSnapshotCardProps = {
  applicationId: string
  snapshot: ApplicationProfileSnapshotDto | null
}

export function ProfileSnapshotCard({
  applicationId,
  snapshot,
}: ProfileSnapshotCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [snapshotAt, setSnapshotAt] = useState(
    snapshot?.snapshotAt ? new Date(snapshot.snapshotAt) : null,
  )

  function onRefresh() {
    const confirmed = window.confirm(
      "Replace the frozen profile used for AI on this application with your current profile? Regenerated cover letters will use the updated summary, skills, and experience.",
    )
    if (!confirmed) return

    startTransition(async () => {
      try {
        const updated = await refreshApplicationProfileSnapshotAction(applicationId)
        setSnapshotAt(new Date(updated.snapshotAt))
        router.refresh()
        toast.success("Profile snapshot refreshed for this application")
      } catch {
        toast.error("Could not refresh profile snapshot")
      }
    })
  }

  const skillCount = snapshot?.skills.length ?? 0
  const hasSummary = Boolean(snapshot?.summary?.trim())
  const experienceCount = Array.isArray(snapshot?.experienceJson)
    ? snapshot.experienceJson.length
    : 0

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Profile used for AI</h2>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Cover letters for this application use a frozen copy of your profile from when
          you tracked the job (or when you last refreshed it).
        </p>

        {snapshot ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Summary</dt>
              <dd className="font-medium">{hasSummary ? "Yes" : "Missing"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Experience</dt>
              <dd className="font-medium">{experienceCount} roles</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Skills</dt>
              <dd className="font-medium">{skillCount}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No snapshot yet — track the job or refresh from your profile.
          </p>
        )}

        {snapshotAt ? (
          <p className="text-xs text-muted-foreground">
            Snapshot from{" "}
            {snapshotAt.toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onRefresh}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="mr-2 size-4" aria-hidden />
            )}
            Refresh from profile
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/profile">Edit profile</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
