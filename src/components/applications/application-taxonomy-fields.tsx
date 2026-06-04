"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  EMPLOYMENT_TYPE_VALUES,
  JOB_CATEGORY_VALUES,
  formatEmploymentTypeLabel,
  formatJobCategoryLabel,
  type EmploymentType,
  type JobCategory,
} from "@/lib/applications"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateApplicationFieldsAction } from "@/lib/applications/actions"

type ApplicationTaxonomyFieldsProps = {
  applicationId: string
  jobCategory: JobCategory
  employmentType: EmploymentType
  jobCategoryOther: string | null
}

export function ApplicationTaxonomyFields({
  applicationId,
  jobCategory,
  employmentType,
  jobCategoryOther,
}: ApplicationTaxonomyFieldsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [category, setCategory] = useState(jobCategory)
  const [employment, setEmployment] = useState(employmentType)
  const [otherText, setOtherText] = useState(jobCategoryOther ?? "")

  function save(fields: {
    jobCategory?: JobCategory
    employmentType?: EmploymentType
    jobCategoryOther?: string
  }) {
    startTransition(async () => {
      try {
        await updateApplicationFieldsAction(applicationId, fields)
        router.refresh()
        toast.success("Job details updated")
      } catch {
        toast.error("Could not update job details")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`job-category-${applicationId}`} className="text-xs text-muted-foreground">
          Job category
        </Label>
        <select
          id={`job-category-${applicationId}`}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={category}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as JobCategory
            setCategory(next)
            save({
              jobCategory: next,
              jobCategoryOther: next === "OTHER" ? otherText : "",
            })
          }}
        >
          {JOB_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {formatJobCategoryLabel(value)}
            </option>
          ))}
        </select>
      </div>

      {category === "OTHER" && (
        <div className="space-y-1.5">
          <Label htmlFor={`job-category-other-${applicationId}`} className="text-xs text-muted-foreground">
            Category (other)
          </Label>
          <Input
            id={`job-category-other-${applicationId}`}
            value={otherText}
            disabled={pending}
            placeholder="e.g. Marketing"
            onChange={(e) => setOtherText(e.target.value)}
            onBlur={() => {
              if (otherText !== (jobCategoryOther ?? "")) {
                save({ jobCategoryOther: otherText })
              }
            }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`employment-type-${applicationId}`} className="text-xs text-muted-foreground">
          Employment type
        </Label>
        <select
          id={`employment-type-${applicationId}`}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={employment}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as EmploymentType
            setEmployment(next)
            save({ employmentType: next })
          }}
        >
          {EMPLOYMENT_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {formatEmploymentTypeLabel(value)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
