"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Download, Sparkles } from "lucide-react"
import type { CoverLetterDto } from "@/lib/applications"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  regenerateCoverLetterAction,
} from "@/lib/applications/generate-cover-letter"
import { saveManualCoverLetterAction } from "@/lib/applications/actions"

type ApplicationLetterEditorProps = {
  applicationId: string
  company: string
  initialLetter: CoverLetterDto | null
  isAiAssisted?: boolean
}

function slugifyCompany(company: string): string {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "application"
}

export function ApplicationLetterEditor({
  applicationId,
  company,
  initialLetter,
  isAiAssisted = false,
}: ApplicationLetterEditorProps) {
  const [content, setContent] = useState(initialLetter?.content ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(initialLetter?.updatedAt ?? null)
  const [letterId, setLetterId] = useState<string | null>(initialLetter?.id ?? null)
  const router = useRouter()
  const [savePending, startSaveTransition] = useTransition()
  const [regenPending, startRegenTransition] = useTransition()

  useEffect(() => {
    setContent(initialLetter?.content ?? "")
    setSavedAt(initialLetter?.updatedAt ?? null)
    setLetterId(initialLetter?.id ?? null)
  }, [initialLetter])

  function onSave() {
    const body = content.trim()
    if (!body) {
      toast.error("Write something before saving")
      return
    }

    startSaveTransition(async () => {
      try {
        const saved = await saveManualCoverLetterAction(applicationId, body)
        setLetterId(saved.id)
        setSavedAt(saved.updatedAt)
        toast.success("Cover letter saved")
        router.refresh()
      } catch {
        toast.error("Could not save cover letter")
      }
    })
  }

  function onRegenerate() {
    const confirmed = window.confirm(
      "Regenerate will adapt your current letter using your profile snapshot and job details. Continue?",
    )
    if (!confirmed) return

    startRegenTransition(async () => {
      const result = await regenerateCoverLetterAction(applicationId)
      if (result.ok === false) {
        toast.error(result.message)
        return
      }
      toast.success("Cover letter regenerated")
      router.refresh()
    })
  }

  async function onCopy() {
    const body = content.trim()
    if (!body) {
      toast.error("Nothing to copy yet")
      return
    }
    try {
      await navigator.clipboard.writeText(body)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  function onDownload() {
    const body = content.trim()
    if (!body) {
      toast.error("Nothing to download yet")
      return
    }
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `cover-letter-${slugifyCompany(company)}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Download started")
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Cover letter</h2>
            {isAiAssisted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                <Sparkles className="size-3" aria-hidden />
                AI-assisted
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAiAssisted
              ? "Review and edit before you apply. Facts are grounded in your profile snapshot."
              : "Free to edit and save. Generate with AI from the job board when you are ready."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAiAssisted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenPending || savePending}
              onClick={onRegenerate}
            >
              {regenPending ? "Regenerating…" : "Regenerate with AI"}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDownload}>
            <Download className="size-3.5" />
            Download .txt
          </Button>
        </div>
      </div>

      <textarea
        rows={14}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your cover letter for this role…"
        className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed"
        aria-label="Cover letter content"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={savePending} onClick={onSave}>
          {savePending ? "Saving…" : "Save cover letter"}
        </Button>
        {savedAt ? (
          <p className="text-xs text-muted-foreground">
            Last saved {savedAt.toLocaleString("en-GB")}
            {letterId ? null : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Not saved yet</p>
        )}
      </div>
    </section>
  )
}
