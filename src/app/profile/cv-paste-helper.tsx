"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  extractSkillsFromText,
  parseCvTextToEducation,
  parseCvTextToExperience,
} from "@/lib/profile/parse-cv-text"
import type { EducationEntry, ExperienceEntry } from "@guavajobs/core"

type CvPasteHelperProps = {
  onApply: (data: {
    experience: ExperienceEntry[]
    education: EducationEntry[]
    skills: string[]
  }) => void
}

export function CvPasteHelper({ onApply }: CvPasteHelperProps) {
  const [text, setText] = useState("")

  function handleApply() {
    if (!text.trim()) return
    onApply({
      experience: parseCvTextToExperience(text),
      education: parseCvTextToEducation(text),
      skills: extractSkillsFromText(text),
    })
    setText("")
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <Label htmlFor="cv-paste">Paste CV or LinkedIn text</Label>
        <p className="text-xs text-muted-foreground">
          We split paragraphs into experience blocks — review and edit before
          saving.
        </p>
      </div>
      <textarea
        id="cv-paste"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your CV text here…"
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      />
      <Button type="button" variant="secondary" size="sm" onClick={handleApply}>
        Apply to form
      </Button>
    </div>
  )
}
