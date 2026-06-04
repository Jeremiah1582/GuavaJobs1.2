import { ApiErrorCode } from "../../api/errors";
import { coverLetterGenerateSchema } from "../../validators/cover-letters";
import { resolveListingForUser } from "../../jobs/resolve-listing";
import { applicationsService } from "../service";
import { CoverLettersServiceError } from "./errors";
import { generateForApplication, type GenerateCoverLetterOptions } from "./generate";

/** Resolve application id from API body `{ applicationId }` or `{ jobId }`. */
export async function resolveApplicationIdForGenerate(
  userId: string,
  body: unknown,
): Promise<string> {
  const parsed = coverLetterGenerateSchema.parse(body);

  if (parsed.applicationId) {
    return parsed.applicationId;
  }

  if (!parsed.jobId) {
    throw new CoverLettersServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "applicationId or jobId is required",
      400,
    );
  }

  const job = await resolveListingForUser(userId, parsed.jobId);
  if (!job) {
    throw new CoverLettersServiceError(ApiErrorCode.NOT_FOUND, "Job not found", 404);
  }

  const application = await applicationsService.createFromJobListing(userId, job);
  return application.id;
}

function optionsFromBody(body: unknown): GenerateCoverLetterOptions | undefined {
  const parsed = coverLetterGenerateSchema.safeParse(body);
  if (!parsed.success) return undefined;
  return {
    adaptExisting: parsed.data.adaptExisting,
    fresh: parsed.data.fresh,
  };
}

export async function generateCoverLetterForBody(userId: string, body: unknown) {
  const applicationId = await resolveApplicationIdForGenerate(userId, body);
  return generateForApplication(userId, applicationId, optionsFromBody(body));
}
