"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  extractSkillsFromText,
  parseCvTextToEducation,
  parseCvTextToExperience,
} from "@/lib/profile/parse-cv-text"
import type { EducationEntry, ExperienceEntry } from "@/lib/validators/profile"
import { cn } from "@/lib/utils"

type CvPasteHelperProps = {
  onApply: (data: {
    experience: ExperienceEntry[]
    education: EducationEntry[]
    skills: string[]
  }) => void
}

export function CvPasteHelper({ onApply }: CvPasteHelperProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")

  function handleApply() {
    if (!text.trim()) return
    onApply({
      experience: parseCvTextToExperience(text),
      education: parseCvTextToEducation(text),
      skills: extractSkillsFromText(text),
    })
    setText("")
    setOpen(false)
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={cn(
        "group rounded-lg border border-dashed border-border/40 transition-opacity duration-300",
        open ? "opacity-100" : "opacity-40 hover:opacity-70",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        Paste CV text (advanced)
      </summary>
      <div className="space-y-3 border-t border-dashed border-border/30 px-3 pb-3 pt-2">
        <div>
          <Label htmlFor="cv-paste" className="text-xs text-muted-foreground">
            Paste CV or LinkedIn text
          </Label>
          <p className="text-[11px] text-muted-foreground/80">
            We split paragraphs into experience blocks — review before saving.
          </p>
        </div>
        <textarea
          id="cv-paste"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your CV text here…"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleApply}>
          Apply to form
        </Button>
      </div>
    </details>
  )
}
