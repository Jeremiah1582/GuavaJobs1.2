"use client"

import { Label } from "@/components/ui/label"
import type { ProfileQuiz } from "@guavajobs/core"

const ROLE_TYPES = [
  "Software engineering",
  "Product / design",
  "Data / analytics",
  "Marketing / growth",
  "Operations",
  "Other",
]

const PRIORITY_OPTIONS = [
  "Salary",
  "Remote work",
  "Learning",
  "Work-life balance",
  "Mission / impact",
  "Career growth",
]

type QuizSectionProps = {
  quiz: ProfileQuiz
  onChange: (quiz: ProfileQuiz) => void
}

export function QuizSection({ quiz, onChange }: QuizSectionProps) {
  const priorities = quiz.priorities ?? []

  function togglePriority(value: string) {
    const next = priorities.includes(value)
      ? priorities.filter((p) => p !== value)
      : [...priorities, value]
    onChange({ ...quiz, priorities: next })
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-foreground">Job preferences</h2>
        <p className="text-sm text-muted-foreground">
          Used later for job matching — stored on your profile.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleType">Role type</Label>
        <select
          id="roleType"
          value={quiz.roleType ?? ""}
          onChange={(e) =>
            onChange({ ...quiz, roleType: e.target.value || undefined })
          }
          className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs"
        >
          <option value="">Select…</option>
          {ROLE_TYPES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Work mode</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["remote", "Remote"],
              ["hybrid", "Hybrid"],
              ["onsite", "On-site"],
              ["flexible", "Flexible"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="workMode"
                value={value}
                checked={quiz.workMode === value}
                onChange={() => onChange({ ...quiz, workMode: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Top priorities</legend>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => togglePriority(option)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                priorities.includes(option)
                  ? "border-guava-green bg-guava-green/10 text-guava-green"
                  : "border-border text-muted-foreground hover:border-guava-green/50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
