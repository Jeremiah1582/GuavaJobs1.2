"use client"

import { CheckCircle2, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProfileUrlImportResult } from "@/lib/validators/profile-import"

function confidenceLabel(confidence: ProfileUrlImportResult["confidence"]) {
  switch (confidence) {
    case "high":
      return { text: "High confidence", className: "text-guava-green" }
    case "medium":
      return {
        text: "Medium confidence — please review",
        className: "text-amber-600 dark:text-amber-400",
      }
    default:
      return {
        text: "Low confidence — review carefully",
        className: "text-destructive",
      }
  }
}

type ProfileImportPreviewProps = {
  preview: ProfileUrlImportResult
  onApply: () => void
  onBack: () => void
  applyLabel?: string
  backLabel?: string
}

export function ProfileImportPreview({
  preview,
  onApply,
  onBack,
  applyLabel = "Apply to profile",
  backLabel = "Try again",
}: ProfileImportPreviewProps) {
  const conf = confidenceLabel(preview.confidence)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-4 text-guava-green" />
        <span className={cn("text-sm font-medium", conf.className)}>
          {conf.text}
        </span>
      </div>

      {preview.pagesScanned.length > 0 ? (
        <div className="rounded-lg border bg-background/60 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Source
          </p>
          <ul className="flex flex-wrap gap-2">
            {preview.pagesScanned.map((page) => (
              <li
                key={page.url + page.path}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs",
                  page.ok
                    ? "bg-guava-green-light/50 text-foreground"
                    : "bg-muted text-muted-foreground line-through",
                )}
              >
                <FileText className="size-3" />
                {page.path}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid gap-2 text-sm">
        {preview.summary ? (
          <div>
            <dt className="font-medium text-foreground">Summary</dt>
            <dd className="line-clamp-3 text-muted-foreground">
              {preview.summary}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-4">
          <div>
            <dt className="font-medium text-foreground">Roles</dt>
            <dd className="text-muted-foreground">
              {preview.experience.length}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Skills</dt>
            <dd className="text-muted-foreground">{preview.skills.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Education</dt>
            <dd className="text-muted-foreground">
              {preview.education.length}
            </dd>
          </div>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onApply}
          className="bg-guava-pink-gradient text-accent-foreground"
        >
          {applyLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    </div>
  )
}
