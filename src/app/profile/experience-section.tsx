"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ExperienceEntry } from "@guavajobs/core"

type ExperienceSectionProps = {
  entries: ExperienceEntry[]
  onChange: (entries: ExperienceEntry[]) => void
}

const emptyEntry = (): ExperienceEntry => ({
  role: "",
  company: "",
  startDate: "",
  bullets: [""],
})

export function ExperienceSection({ entries, onChange }: ExperienceSectionProps) {
  function updateEntry(index: number, patch: Partial<ExperienceEntry>) {
    const next = entries.map((e, i) => (i === index ? { ...e, ...patch } : e))
    onChange(next)
  }

  function updateBullet(entryIndex: number, bulletIndex: number, value: string) {
    const entry = entries[entryIndex]
    const bullets = [...entry.bullets]
    bullets[bulletIndex] = value
    updateEntry(entryIndex, { bullets })
  }

  function addBullet(entryIndex: number) {
    const entry = entries[entryIndex]
    updateEntry(entryIndex, { bullets: [...entry.bullets, ""] })
  }

  function removeBullet(entryIndex: number, bulletIndex: number) {
    const entry = entries[entryIndex]
    const bullets = entry.bullets.filter((_, i) => i !== bulletIndex)
    updateEntry(entryIndex, { bullets: bullets.length ? bullets : [""] })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Experience</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...entries, emptyEntry()])}
        >
          <Plus className="size-4" />
          Add role
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No roles yet. Add one or paste from your CV below.
        </p>
      ) : null}

      {entries.map((entry, entryIndex) => (
        <div
          key={entryIndex}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove role"
              onClick={() =>
                onChange(entries.filter((_, i) => i !== entryIndex))
              }
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={entry.role}
                onChange={(e) =>
                  updateEntry(entryIndex, { role: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={entry.company}
                onChange={(e) =>
                  updateEntry(entryIndex, { company: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                value={entry.startDate}
                placeholder="e.g. Jan 2022"
                onChange={(e) =>
                  updateEntry(entryIndex, { startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                value={entry.endDate ?? ""}
                placeholder="Present or Mar 2024"
                onChange={(e) =>
                  updateEntry(entryIndex, { endDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bullets</Label>
            {entry.bullets.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="flex gap-2">
                <Input
                  value={bullet}
                  onChange={(e) =>
                    updateBullet(entryIndex, bulletIndex, e.target.value)
                  }
                  placeholder="Achievement or responsibility"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove bullet"
                  onClick={() => removeBullet(entryIndex, bulletIndex)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBullet(entryIndex)}
            >
              Add bullet
            </Button>
          </div>
        </div>
      ))}
    </section>
  )
}
