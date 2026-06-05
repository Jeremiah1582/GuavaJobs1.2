"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Download, Sparkles } from "lucide-react"
import type { CoverLetterDto } from "@/lib/applications"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  generateCoverLetterForApplicationAction,
  regenerateCoverLetterAction,
} from "@/lib/applications/generate-cover-letter"
import { saveManualCoverLetterAction } from "@/lib/applications/actions"

type ApplicationLetterEditorProps = {
  applicationId: string
  company: string
  initialLetter: CoverLetterDto | null
  isAiAssisted?: boolean
  hasJobDescription?: boolean
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
  hasJobDescription = false,
}: ApplicationLetterEditorProps) {
  const [content, setContent] = useState(initialLetter?.content ?? "")
  const [savedAt, setSavedAt] = useState<Date | null>(initialLetter?.updatedAt ?? null)
  const [letterId, setLetterId] = useState<string | null>(initialLetter?.id ?? null)
  const router = useRouter()
  const [savePending, startSaveTransition] = useTransition()
  const [generatePending, startGenerateTransition] = useTransition()

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

  function onGenerate() {
    if (!hasJobDescription) {
      toast.error("Add a job description before generating a cover letter")
      return
    }

    const hasContent = Boolean(content.trim())
    if (hasContent) {
      const confirmed = window.confirm(
        isAiAssisted
          ? "Regenerate will adapt your current letter using your profile and this job. Continue?"
          : "Generate will create a new AI draft from your profile and this job. Your current text will be replaced after generation. Continue?",
      )
      if (!confirmed) return
    }

    startGenerateTransition(async () => {
      const result = hasContent && isAiAssisted
        ? await regenerateCoverLetterAction(applicationId)
        : await generateCoverLetterForApplicationAction(applicationId)

      if (result.ok === false) {
        toast.error(result.message)
        return
      }
      toast.success(hasContent ? "Cover letter regenerated" : "Cover letter generated")
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

  const hasContent = Boolean(content.trim())

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generate a tailored draft from your profile and this job, then edit freely before you
        apply.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={generatePending || savePending || !hasJobDescription}
          onClick={onGenerate}
          className="gap-1.5"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {generatePending
            ? "Generating…"
            : hasContent
              ? "Regenerate with AI"
              : "Generate with AI"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={!hasContent}>
          <Copy className="size-3.5" aria-hidden />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={!hasContent}
        >
          <Download className="size-3.5" aria-hidden />
          Download .txt
        </Button>
      </div>

      {!hasJobDescription && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Add the job description above before generating a letter.
        </p>
      )}

      <textarea
        rows={14}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your cover letter for this role, or generate a draft with AI…"
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed"
        aria-label="Cover letter content"
      />

      <div className="flex flex-wrap items-center gap-3">
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
    </div>
  )
}
