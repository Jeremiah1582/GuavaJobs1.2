import { ApiErrorCode } from "../api/errors";
import type { ApplicationProfileSnapshotDto } from "../applications/snapshots";
import { CoverLettersServiceError } from "../applications/cover-letter/errors";
import {
  AiClientError,
  chatCompletion,
} from "./client";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
  parseCoverLetterGeneration,
  type CoverLetterAtsContext,
} from "./cover-letter-prompt";
import type { JobListingSnapshot } from "../applications/snapshots";

export type GenerateCoverLetterInput = {
  jobTitle: string;
  company: string;
  jobDescription: string;
  profile: ApplicationProfileSnapshotDto;
  /** User.displayName from the database — used for signature and placeholder replacement. */
  candidateDisplayName: string;
  jobListing?: JobListingSnapshot;
  existingLetter?: string | null;
  adaptExisting?: boolean;
  atsContext?: CoverLetterAtsContext;
};

export type GenerateCoverLetterAiResult = {
  content: string;
  citations: { field: string; excerpt: string }[];
};

export function profileSnapshotToPromptText(
  snapshot: ApplicationProfileSnapshotDto,
): string {
  return JSON.stringify(
    {
      summary: snapshot.summary,
      experience: snapshot.experienceJson,
      skills: snapshot.skills,
      education: snapshot.educationJson,
      snapshotAt: snapshot.snapshotAt.toISOString(),
    },
    null,
    2,
  );
}

function mapAiError(error: AiClientError): CoverLettersServiceError {
  switch (error.code) {
    case "MISSING_API_KEY":
      return new CoverLettersServiceError(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        error.message,
        503,
        "AI cover letters are not configured. Add OPENAI_API_KEY or OPENROUTER_API_KEY to app/.env.local and restart the server.",
      );
    case "INVALID_API_KEY":
      return new CoverLettersServiceError(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        error.message,
        503,
        "Your AI API key was rejected. Use an OpenAI key for OpenAI, or an OpenRouter key (sk-or-v1-…) which is routed automatically.",
      );
    case "TIMEOUT":
      return new CoverLettersServiceError(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        error.message,
        503,
        "Generation took too long. Please try again.",
      );
    case "MODERATION":
      return new CoverLettersServiceError(
        ApiErrorCode.VALIDATION_ERROR,
        error.message,
        400,
        "We could not generate a letter for this content. Edit your profile and try again.",
      );
    default:
      return new CoverLettersServiceError(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        error.message,
        503,
        "AI provider error. Please try again shortly.",
      );
  }
}

export async function generateCoverLetterWithOpenAI(
  input: GenerateCoverLetterInput,
): Promise<GenerateCoverLetterAiResult> {
  const jobListing: JobListingSnapshot = input.jobListing ?? {
    title: input.jobTitle,
    company: input.company,
    location: null,
    salaryText: null,
    category: null,
    contractType: null,
    externalId: null,
    redirectUrl: null,
    postedAt: null,
    capturedAt: new Date().toISOString(),
  };

  const candidateDisplayName = input.candidateDisplayName.trim();

  const userPrompt = buildCoverLetterUserPrompt({
    jobListing,
    jobDescriptionText: input.jobDescription,
    profile: input.profile,
    candidateDisplayName,
    existingLetter: input.existingLetter,
    adaptExisting: input.adaptExisting,
    atsContext: input.atsContext,
  });

  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: "system",
          content: buildCoverLetterSystemPrompt(candidateDisplayName),
        },
        { role: "user", content: userPrompt },
      ],
      responseFormat: "json_object",
    });
    return parseCoverLetterGeneration(raw, candidateDisplayName);
  } catch (error) {
    if (error instanceof AiClientError) {
      throw mapAiError(error);
    }
    throw error;
  }
}
