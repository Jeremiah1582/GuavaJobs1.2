"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Copy, Download, Sparkles } from "lucide-react"
import type { CoverLetterDto } from "@/lib/applications"
import { toast } from "sonner"

import { CoverLetterMergeAnimation } from "@/components/ui/cover-letter-merge-animation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  generateCoverLetterForApplicationAction,
  regenerateCoverLetterAction,
} from "@/lib/applications/generate-cover-letter"
import { saveManualCoverLetterAction } from "@/lib/applications/actions"
import { cn } from "@/lib/utils"

type ApplicationLetterEditorProps = {
  applicationId: string
  company: string
  initialLetter: CoverLetterDto | null
  isAiAssisted?: boolean
  hasJobDescription?: boolean
}

const MERGE_SUCCESS_MS = 800

function slugifyCompany(company: string): string {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "application"
}

function letterStatusBadge(letter: CoverLetterDto | null, isAiAssisted: boolean) {
  if (!letter?.content?.trim()) return null
  if (letter.isUserEdited) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Edited by you
      </Badge>
    )
  }
  if (letter.source === "AI" || isAiAssisted) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Sparkles className="size-3" aria-hidden />
        AI draft
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      Draft saved
    </Badge>
  )
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
  const [isUserEdited, setIsUserEdited] = useState(initialLetter?.isUserEdited ?? false)
  const [showMergeAnimation, setShowMergeAnimation] = useState(false)
  const [mergeComplete, setMergeComplete] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [savePending, startSaveTransition] = useTransition()
  const [generatePending, startGenerateTransition] = useTransition()

  useEffect(() => {
    setContent(initialLetter?.content ?? "")
    setSavedAt(initialLetter?.updatedAt ?? null)
    setLetterId(initialLetter?.id ?? null)
    setIsUserEdited(initialLetter?.isUserEdited ?? false)
  }, [initialLetter])

  function dismissMergeAnimationAfterSuccess() {
    window.setTimeout(() => {
      setShowMergeAnimation(false)
      setMergeComplete(false)
    }, MERGE_SUCCESS_MS)
  }

  const statusLetter: CoverLetterDto | null = letterId
    ? {
        id: letterId,
        applicationId,
        content,
        source: initialLetter?.source ?? "MANUAL",
        citations: initialLetter?.citations ?? [],
        isUserEdited,
        createdAt: initialLetter?.createdAt ?? new Date(),
        updatedAt: savedAt ?? new Date(),
      }
    : initialLetter

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
        setIsUserEdited(saved.isUserEdited)
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
      const confirmMessage = isUserEdited
        ? "Regenerate will replace your edited letter with a new AI draft from your profile and this job. Continue?"
        : isAiAssisted
          ? "Regenerate will adapt your current letter using your profile and this job. Continue?"
          : "Generate will create a new AI draft from your profile and this job. Your current text will be replaced after generation. Continue?"
      if (!window.confirm(confirmMessage)) return
    }

    setShowMergeAnimation(true)
    setMergeComplete(false)

    startGenerateTransition(async () => {
      try {
        const result =
          hasContent && isAiAssisted
            ? await regenerateCoverLetterAction(applicationId)
            : await generateCoverLetterForApplicationAction(applicationId)

        if (result.ok === false) {
          setShowMergeAnimation(false)
          setMergeComplete(false)
          toast.error(result.message)
          return
        }

        const { letter } = result
        setContent(letter.content)
        setLetterId(letter.id)
        setSavedAt(new Date(letter.updatedAt))
        setIsUserEdited(letter.isUserEdited)
        setMergeComplete(true)
        dismissMergeAnimationAfterSuccess()
        router.replace(`${pathname}?generated=1`, { scroll: false })
        router.refresh()
      } catch {
        setShowMergeAnimation(false)
        setMergeComplete(false)
        toast.error("Could not generate cover letter")
      }
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
  const isGenerating = generatePending || showMergeAnimation
  const badge = letterStatusBadge(statusLetter, isAiAssisted)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Generate a tailored draft from your profile and this job, then edit freely before you
          apply.
        </p>
        {badge}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isGenerating || savePending || !hasJobDescription}
          onClick={onGenerate}
          className="gap-1.5 bg-guava-pink-gradient text-accent-foreground hover:opacity-90"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {isGenerating
            ? "Generating…"
            : hasContent
              ? "Regenerate with AI"
              : "Generate with AI"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!hasContent || isGenerating}
        >
          <Copy className="size-3.5" aria-hidden />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={!hasContent || isGenerating}
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

      {showMergeAnimation ? (
        <CoverLetterMergeAnimation active={showMergeAnimation} complete={mergeComplete} />
      ) : (
        <textarea
          rows={14}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your cover letter for this role, or generate a draft with AI…"
          className={cn(
            "w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed",
            isGenerating && "pointer-events-none opacity-50",
          )}
          aria-label="Cover letter content"
          disabled={isGenerating}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={savePending || isGenerating} onClick={onSave}>
          {savePending ? "Saving…" : "Save cover letter"}
        </Button>
        {savedAt ? (
          <p className="text-xs text-muted-foreground">
            Last saved {savedAt.toLocaleString("en-GB")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Not saved yet</p>
        )}
      </div>
    </div>
  )
}
