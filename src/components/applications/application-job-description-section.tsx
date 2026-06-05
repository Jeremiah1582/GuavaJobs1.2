"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Loader2, Pencil } from "lucide-react"
import { apiErrorMessage, parseApiResponse } from "@/lib/parse-api-response"
import type { JobListingSnapshot } from "@/lib/applications/snapshots"
import { Button } from "@/components/ui/button"

type ApplicationJobDescriptionSectionProps = {
  applicationId: string
  initialDescription: string | null
  jobListingSnapshot: JobListingSnapshot | null
}

export function ApplicationJobDescriptionSection({
  applicationId,
  initialDescription,
  jobListingSnapshot,
}: ApplicationJobDescriptionSectionProps) {
  const router = useRouter()
  const [description, setDescription] = useState(initialDescription ?? "")
  const [editing, setEditing] = useState(!initialDescription?.trim())
  const [draft, setDraft] = useState(initialDescription ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSave() {
    const text = draft.trim()
    if (!text) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: text }),
        })
        const data = await parseApiResponse<{ error?: string }>(res)
        if (!res.ok) {
          throw new Error(apiErrorMessage(data) ?? "Could not save job description.")
        }
        setDescription(text)
        setEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save job description.")
      }
    })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Briefcase className="size-4" aria-hidden />
          Job description
        </h2>
        {description.trim() && !editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={() => {
              setDraft(description)
              setEditing(true)
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        )}
      </div>
      <div className="space-y-4 p-5">
        {jobListingSnapshot && (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            {jobListingSnapshot.salaryText && (
              <div>
                <dt className="text-xs text-muted-foreground">Salary</dt>
                <dd className="mt-0.5 font-medium">{jobListingSnapshot.salaryText}</dd>
              </div>
            )}
            {jobListingSnapshot.category && (
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="mt-0.5 font-medium">{jobListingSnapshot.category}</dd>
              </div>
            )}
            {jobListingSnapshot.contractType && (
              <div>
                <dt className="text-xs text-muted-foreground">Contract</dt>
                <dd className="mt-0.5 font-medium">{jobListingSnapshot.contractType}</dd>
              </div>
            )}
          </dl>
        )}

        {editing ? (
          <div className="space-y-3">
            {!description.trim() && (
              <p className="text-sm text-muted-foreground">
                No job description on this application yet. Paste the full posting so we can
                analyze fit and tailor your cover letter.
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={10}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onSave} disabled={pending || !draft.trim()}>
                {pending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save description"
                )}
              </Button>
              {description.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(description)
                    setEditing(false)
                    setError(null)
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : description.trim() ? (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
    </section>
  )
}
