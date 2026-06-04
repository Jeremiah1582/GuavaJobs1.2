import { prisma } from "@/db";
import { ApiErrorCode } from "../../api/errors";
import { generateCoverLetterWithOpenAI } from "../../ai/generate-cover-letter";
import { isProfileReadyForAi } from "../../ai/profile-readiness";
import { assertCanGenerateAiLetter } from "../../ai/usage";
import { applicationsService } from "../service";
import { CoverLettersServiceError } from "./errors";
import type { CoverLetterCitation, CoverLetterDto } from "./types";
import { upsertLetter } from "./index";

export type { CoverLetterCitation };

export type GenerateCoverLetterOptions = {
  adaptExisting?: boolean;
  fresh?: boolean;
};

export type GenerateCoverLetterResult = {
  applicationId: string;
  letter: CoverLetterDto;
  citations: CoverLetterCitation[];
};

async function getUserDisplayName(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  const name = user?.displayName?.trim();
  return name && name.length > 0 ? name : null;
}

export async function generateForApplication(
  userId: string,
  applicationId: string,
  options?: GenerateCoverLetterOptions,
): Promise<GenerateCoverLetterResult> {
  await assertCanGenerateAiLetter(userId);

  const bundle = await applicationsService.getBundleForUser(userId, applicationId);
  const { application, jobDescriptionText, jobListingSnapshot, letter: existingLetter } =
    bundle;

  let profileSnapshot = bundle.profileSnapshot;
  if (!isProfileReadyForAi(profileSnapshot)) {
    profileSnapshot = await applicationsService.refreshProfileSnapshot(
      userId,
      applicationId,
    );
  }

  if (!isProfileReadyForAi(profileSnapshot)) {
    throw new CoverLettersServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "Profile incomplete for AI generation",
      400,
      "Add a summary, experience, or skills to your profile before generating.",
    );
  }

  const jd = jobDescriptionText?.trim();
  if (!jd) {
    throw new CoverLettersServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "Job description missing for application",
      400,
      "This application has no job description to generate from.",
    );
  }

  const adaptExisting =
    options?.fresh === true
      ? false
      : (options?.adaptExisting ?? Boolean(existingLetter?.content?.trim()));

  const candidateDisplayName = await getUserDisplayName(userId);
  if (!candidateDisplayName) {
    throw new CoverLettersServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "Display name required for cover letter",
      400,
      "Add your full name on your profile before generating a cover letter.",
    );
  }

  const generated = await generateCoverLetterWithOpenAI({
    jobTitle: application.title,
    company: application.company,
    jobDescription: jd,
    profile: profileSnapshot!,
    candidateDisplayName,
    jobListing: jobListingSnapshot ?? undefined,
    existingLetter: existingLetter?.content ?? null,
    adaptExisting,
  });

  const saved = await upsertLetter(
    userId,
    applicationId,
    { content: generated.content },
    { source: "AI", citations: generated.citations },
  );

  return {
    applicationId,
    letter: saved,
    citations: generated.citations,
  };
}
