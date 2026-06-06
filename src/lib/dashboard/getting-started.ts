import type { ApplicationListItem } from "@/lib/applications"
import type { ProfileDto } from "@/lib/profile/service"

export type GettingStartedStep = {
  number: 1 | 2 | 3
  title: string
  description: string
  href: string
  complete: boolean
  current: boolean
}

export type GettingStartedState = {
  steps: GettingStartedStep[]
  currentStep: 1 | 2 | 3 | null
  allComplete: boolean
  progressPercent: number
}

export function computeGettingStartedState(
  profile: ProfileDto | null,
  applications: ApplicationListItem[],
): GettingStartedState {
  const step1Complete =
    Boolean(profile?.cvFileUrl?.trim()) ||
    Boolean(profile?.lastImportedAt) ||
    (profile?.completeness.percent ?? 0) >= 50

  const step2Complete = applications.length > 0

  const step3Complete = applications.some((app) => app.hasCoverLetter)

  const currentStep: 1 | 2 | 3 | null = !step1Complete
    ? 1
    : !step2Complete
      ? 2
      : !step3Complete
        ? 3
        : null

  const draftWithoutLetter = applications.find((app) => !app.hasCoverLetter)
  const step3Href = draftWithoutLetter
    ? `/dashboard/applications/${draftWithoutLetter.id}`
    : applications[0]
      ? `/dashboard/applications/${applications[0].id}`
      : "/dashboard/applications"

  const steps: GettingStartedStep[] = [
    {
      number: 1,
      title: "Upload your CV or profile URL",
      description: "We use this to match roles and draft cover letters.",
      href: "/dashboard/profile",
      complete: step1Complete,
      current: currentStep === 1,
    },
    {
      number: 2,
      title: "Choose a job listing",
      description: "Browse internships ranked for you and track the ones you like.",
      href: "/dashboard/jobs",
      complete: step2Complete,
      current: currentStep === 2,
    },
    {
      number: 3,
      title: "Generate your application",
      description: "AI builds a tailored cover letter — review, edit, and submit.",
      href: step3Href,
      complete: step3Complete,
      current: currentStep === 3,
    },
  ]

  const completedCount = steps.filter((step) => step.complete).length
  const progressPercent = Math.round((completedCount / 3) * 100)

  return {
    steps,
    currentStep,
    allComplete: completedCount === 3,
    progressPercent,
  }
}
