"use client"

import { ExternalLink, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  EMPLOYMENT_PREFERENCE_LABELS,
  EMPLOYMENT_PREFERENCE_VALUES,
  LANGUAGE_PROFICIENCY_LABELS,
  PERSONALITY_TEST_URL,
  RELOCATION_LABELS,
  RIGHT_TO_WORK_LABELS,
  SALARY_PERIOD_LABELS,
  SENIORITY_LEVEL_LABELS,
  type EmploymentType,
  type LanguageProficiency,
  type ProfileLanguageEntry,
  type RelocationWillingness,
  type RightToWorkStatus,
  type SalaryPeriod,
  type SeniorityLevel,
} from "@guavajobs/core"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type CareerPreferencesState = {
  linkedInUrl: string
  githubUrl: string
  aspiringRole: string
  personalityType: string
  languages: ProfileLanguageEntry[]
  salaryCurrency: string
  salaryMin: string
  salaryMax: string
  salaryPeriod: SalaryPeriod | ""
  salaryNegotiable: boolean
  rightToWork: RightToWorkStatus | ""
  rightToWorkNote: string
  noticePeriodWeeks: string
  availableFrom: string
  targetSeniority: SeniorityLevel | ""
  employmentTypePreference: Exclude<EmploymentType, "UNKNOWN"> | ""
  relocationWillingness: RelocationWillingness | ""
}

type CareerPreferencesSectionProps = {
  value: CareerPreferencesState
  onChange: (value: CareerPreferencesState) => void
}

const emptyLanguage = (): ProfileLanguageEntry => ({
  language: "",
  proficiency: "PROFESSIONAL",
})

export function CareerPreferencesSection({
  value,
  onChange,
}: CareerPreferencesSectionProps) {
  function patch(partial: Partial<CareerPreferencesState>) {
    onChange({ ...value, ...partial })
  }

  function updateLanguage(index: number, entry: ProfileLanguageEntry) {
    const next = [...value.languages]
    next[index] = entry
    patch({ languages: next })
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-xl text-foreground">Career goals & logistics</h2>
        <p className="text-sm text-muted-foreground">
          Helps employers screen you faster and powers upcoming career guidance features.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aspiringRole">Role you aspire to</Label>
        <Input
          id="aspiringRole"
          value={value.aspiringRole}
          onChange={(e) => patch({ aspiringRole: e.target.value })}
          placeholder="e.g. Senior product designer"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Your target next step — can differ from your current headline.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
        <Label htmlFor="personalityType">16Personalities type</Label>
        <Input
          id="personalityType"
          value={value.personalityType}
          onChange={(e) => patch({ personalityType: e.target.value })}
          placeholder="e.g. INTJ-T or Advocate (INFJ-A)"
          maxLength={80}
        />
        {!value.personalityType.trim() ? (
          <p className="text-sm text-muted-foreground">
            Not sure yet?{" "}
            <Link
              href={PERSONALITY_TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent underline-offset-4 hover:underline"
            >
              Take the free 16Personalities test
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>{" "}
            and paste your type here.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Used in future versions for strengths, growth areas, and career path suggestions.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedInUrl">LinkedIn</Label>
          <Input
            id="linkedInUrl"
            type="url"
            value={value.linkedInUrl}
            onChange={(e) => patch({ linkedInUrl: e.target.value })}
            placeholder="https://linkedin.com/in/you"
            maxLength={2000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="githubUrl">GitHub</Label>
          <Input
            id="githubUrl"
            type="url"
            value={value.githubUrl}
            onChange={(e) => patch({ githubUrl: e.target.value })}
            placeholder="https://github.com/you"
            maxLength={2000}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Languages</legend>
        {value.languages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add languages you can use at work.</p>
        ) : null}
        {value.languages.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1 space-y-1">
              <Label className="sr-only">Language</Label>
              <Input
                value={entry.language}
                onChange={(e) =>
                  updateLanguage(index, { ...entry, language: e.target.value })
                }
                placeholder="e.g. English"
                maxLength={80}
              />
            </div>
            <div className="w-40 space-y-1">
              <Label className="sr-only">Proficiency</Label>
              <select
                value={entry.proficiency}
                onChange={(e) =>
                  updateLanguage(index, {
                    ...entry,
                    proficiency: e.target.value as LanguageProficiency,
                  })
                }
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs"
              >
                {(Object.keys(LANGUAGE_PROFICIENCY_LABELS) as LanguageProficiency[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {LANGUAGE_PROFICIENCY_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                patch({
                  languages: value.languages.filter((_, i) => i !== index),
                })
              }
              aria-label="Remove language"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ languages: [...value.languages, emptyLanguage()] })}
        >
          <Plus className="mr-1 size-4" />
          Add language
        </Button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border/60 p-4">
        <legend className="text-sm font-medium">Salary expectations</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="salaryCurrency">Currency</Label>
            <Input
              id="salaryCurrency"
              value={value.salaryCurrency}
              onChange={(e) => patch({ salaryCurrency: e.target.value })}
              placeholder="GBP"
              maxLength={10}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="salaryMin">Minimum</Label>
            <Input
              id="salaryMin"
              type="number"
              min={0}
              value={value.salaryMin}
              onChange={(e) => patch({ salaryMin: e.target.value })}
              placeholder="40000"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="salaryMax">Maximum</Label>
            <Input
              id="salaryMax"
              type="number"
              min={0}
              value={value.salaryMax}
              onChange={(e) => patch({ salaryMax: e.target.value })}
              placeholder="55000"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="salaryPeriod">Period</Label>
            <select
              id="salaryPeriod"
              value={value.salaryPeriod}
              onChange={(e) =>
                patch({ salaryPeriod: e.target.value as SalaryPeriod | "" })
              }
              className="border-input bg-background flex h-10 rounded-md border px-3 py-2 text-sm shadow-xs"
            >
              <option value="">Select…</option>
              {(Object.keys(SALARY_PERIOD_LABELS) as SalaryPeriod[]).map((key) => (
                <option key={key} value={key}>
                  {SALARY_PERIOD_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={value.salaryNegotiable}
              onChange={(e) => patch({ salaryNegotiable: e.target.checked })}
            />
            Open to negotiation
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rightToWork">Right to work (UK)</Label>
          <select
            id="rightToWork"
            value={value.rightToWork}
            onChange={(e) =>
              patch({ rightToWork: e.target.value as RightToWorkStatus | "" })
            }
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs"
          >
            <option value="">Select…</option>
            {(Object.keys(RIGHT_TO_WORK_LABELS) as RightToWorkStatus[]).map((key) => (
              <option key={key} value={key}>
                {RIGHT_TO_WORK_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="noticePeriodWeeks">Notice period (weeks)</Label>
          <Input
            id="noticePeriodWeeks"
            type="number"
            min={0}
            max={104}
            value={value.noticePeriodWeeks}
            onChange={(e) => patch({ noticePeriodWeeks: e.target.value })}
            placeholder="4"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rightToWorkNote">Right to work notes (optional)</Label>
        <Input
          id="rightToWorkNote"
          value={value.rightToWorkNote}
          onChange={(e) => patch({ rightToWorkNote: e.target.value })}
          placeholder="e.g. Visa expires March 2027"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availableFrom">Available from (optional)</Label>
        <Input
          id="availableFrom"
          type="date"
          value={value.availableFrom}
          onChange={(e) => patch({ availableFrom: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetSeniority">Target seniority</Label>
          <select
            id="targetSeniority"
            value={value.targetSeniority}
            onChange={(e) =>
              patch({ targetSeniority: e.target.value as SeniorityLevel | "" })
            }
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs"
          >
            <option value="">Select…</option>
            {(Object.keys(SENIORITY_LEVEL_LABELS) as SeniorityLevel[]).map((key) => (
              <option key={key} value={key}>
                {SENIORITY_LEVEL_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="employmentTypePreference">Employment type</Label>
          <select
            id="employmentTypePreference"
            value={value.employmentTypePreference}
            onChange={(e) =>
              patch({
                employmentTypePreference: e.target.value as Exclude<
                  EmploymentType,
                  "UNKNOWN"
                > | "",
              })
            }
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-xs"
          >
            <option value="">Select…</option>
            {EMPLOYMENT_PREFERENCE_VALUES.map((key) => (
              <option key={key} value={key}>
                {EMPLOYMENT_PREFERENCE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relocationWillingness">Relocation</Label>
        <select
          id="relocationWillingness"
          value={value.relocationWillingness}
          onChange={(e) =>
            patch({
              relocationWillingness: e.target.value as RelocationWillingness | "",
            })
          }
          className="border-input bg-background flex h-10 w-full max-w-md rounded-md border px-3 py-2 text-sm shadow-xs"
        >
          <option value="">Select…</option>
          {(Object.keys(RELOCATION_LABELS) as RelocationWillingness[]).map((key) => (
            <option key={key} value={key}>
              {RELOCATION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

export function careerPreferencesFromProfile(
  profile: import("@guavajobs/core").ProfileDto,
): CareerPreferencesState {
  return {
    linkedInUrl: profile.linkedInUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    aspiringRole: profile.aspiringRole ?? "",
    personalityType: profile.personalityType ?? "",
    languages: profile.languagesJson.length > 0 ? profile.languagesJson : [],
    salaryCurrency: profile.salaryCurrency ?? "GBP",
    salaryMin: profile.salaryMin != null ? String(profile.salaryMin) : "",
    salaryMax: profile.salaryMax != null ? String(profile.salaryMax) : "",
    salaryPeriod: (profile.salaryPeriod as SalaryPeriod) ?? "ANNUAL",
    salaryNegotiable: profile.salaryNegotiable,
    rightToWork: (profile.rightToWork as RightToWorkStatus) ?? "",
    rightToWorkNote: profile.rightToWorkNote ?? "",
    noticePeriodWeeks:
      profile.noticePeriodWeeks != null ? String(profile.noticePeriodWeeks) : "",
    availableFrom: profile.availableFrom
      ? profile.availableFrom.slice(0, 10)
      : "",
    targetSeniority: (profile.targetSeniority as SeniorityLevel) ?? "",
    employmentTypePreference:
      (profile.employmentTypePreference as Exclude<EmploymentType, "UNKNOWN">) ?? "",
    relocationWillingness:
      (profile.relocationWillingness as RelocationWillingness) ?? "",
  }
}
