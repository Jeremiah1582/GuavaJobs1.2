"use client"

import { useEffect, useState } from "react"
import { ChevronDown, FileText, Sparkles } from "lucide-react"
import type { CoverLetterDto } from "@/lib/applications"
import { ApplicationLetterEditor } from "@/components/applications/application-letter-editor"
import { LetterGroundingPanel } from "@/components/applications/letter-grounding-panel"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type ApplicationCoverLetterSectionProps = {
  applicationId: string
  company: string
  initialLetter: CoverLetterDto | null
  isAiAssisted?: boolean
  hasJobDescription?: boolean
}

export function ApplicationCoverLetterSection({
  applicationId,
  company,
  initialLetter,
  isAiAssisted = false,
  hasJobDescription = false,
}: ApplicationCoverLetterSectionProps) {
  const hasLetter = Boolean(initialLetter?.content?.trim())
  const [open, setOpen] = useState(hasLetter)

  useEffect(() => {
    if (hasLetter) setOpen(true)
  }, [hasLetter])

  const preview = hasLetter
    ? initialLetter!.content.trim().slice(0, 120) + (initialLetter!.content.length > 120 ? "…" : "")
    : null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3 text-left transition-colors hover:bg-muted/50"
            aria-expanded={open}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Cover letter</h2>
                {!open && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {hasLetter
                      ? preview
                      : "Collapsed — generate with AI or write your own when ready"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasLetter ? (
                initialLetter!.isUserEdited ? (
                  <Badge variant="outline" className="text-[10px]">
                    Edited by you
                  </Badge>
                ) : isAiAssisted || initialLetter!.source === "AI" ? (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Sparkles className="size-3" aria-hidden />
                    AI draft
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Draft saved
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Not started
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-5">
            <ApplicationLetterEditor
              applicationId={applicationId}
              company={company}
              initialLetter={initialLetter}
              isAiAssisted={isAiAssisted}
              hasJobDescription={hasJobDescription}
            />
            {(initialLetter?.citations?.length ?? 0) > 0 && (
              <LetterGroundingPanel citations={initialLetter!.citations} />
            )}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
