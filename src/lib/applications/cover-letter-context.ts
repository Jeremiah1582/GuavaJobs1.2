import {
  applicationsService,
  coverLettersService,
  profileService,
  type ProfileCompleteness,
} from "@guavajobs/core"

const PROFILE_READY_PERCENT = 80

export type JobCoverLetterContext = {
  profileReady: boolean
  applicationId: string | null
  hasLetter: boolean
  completeness: ProfileCompleteness
}

export async function getJobCoverLetterContext(
  userId: string | null,
  jobExternalId: string,
): Promise<JobCoverLetterContext> {
  const emptyCompleteness: ProfileCompleteness = { percent: 0, missing: [] }

  if (!userId) {
    return {
      profileReady: false,
      applicationId: null,
      hasLetter: false,
      completeness: emptyCompleteness,
    }
  }

  await profileService.getOrCreateForUser(userId)
  const profile = await profileService.getByUserId(userId)
  const completeness = profile?.completeness ?? emptyCompleteness
  const profileReady = completeness.percent >= PROFILE_READY_PERCENT

  const application = await applicationsService.findByUserAndExternalId(
    userId,
    jobExternalId,
  )

  if (!application) {
    return { profileReady, applicationId: null, hasLetter: false, completeness }
  }

  const letter = await coverLettersService.getLetterForApplication(
    userId,
    application.id,
  )

  return {
    profileReady,
    applicationId: application.id,
    hasLetter: Boolean(letter?.content?.trim()),
    completeness,
  }
}
