import { prisma } from "@/db";
import { extractIdealCandidateProfile, IcpExtractionError } from "./analyze";
import { descriptionFingerprint } from "./fingerprint";
import {
  EMPTY_ICP,
  idealCandidateProfileSchema,
  type IdealCandidateProfile,
  type JobInsightDto,
} from "./types";

function parseKeywords(value: unknown): { required: string[]; preferred: string[] } {
  if (!value || typeof value !== "object") {
    return { required: [], preferred: [] };
  }
  const row = value as Record<string, unknown>;
  const required = Array.isArray(row.required)
    ? row.required.filter((v): v is string => typeof v === "string")
    : [];
  const preferred = Array.isArray(row.preferred)
    ? row.preferred.filter((v): v is string => typeof v === "string")
    : [];
  return { required, preferred };
}

function mapInsightRow(
  row: {
    id: string;
    jobExternalId: string | null;
    jobSource: string | null;
    title: string | null;
    company: string | null;
    icpJson: unknown;
    keywordsJson: unknown;
    modelVersion: string;
    analyzedAt: Date;
  },
  cached: boolean,
): JobInsightDto {
  const icpParsed = idealCandidateProfileSchema.safeParse(row.icpJson);
  const icp: IdealCandidateProfile = icpParsed.success ? icpParsed.data : EMPTY_ICP;

  return {
    id: row.id,
    jobExternalId: row.jobExternalId,
    jobSource: row.jobSource,
    title: row.title,
    company: row.company,
    icp,
    keywords: parseKeywords(row.keywordsJson),
    modelVersion: row.modelVersion,
    analyzedAt: row.analyzedAt.toISOString(),
    cached,
  };
}

export type GetOrCreateJobInsightInput = {
  jdText: string;
  jobExternalId?: string | null;
  jobSource?: string | null;
  title?: string | null;
  company?: string | null;
};

export async function getOrCreateJobInsight(
  input: GetOrCreateJobInsightInput,
): Promise<JobInsightDto> {
  const jdText = input.jdText.trim();
  const fingerprint = descriptionFingerprint(jdText);
  const externalId = input.jobExternalId?.trim() || null;
  const source = input.jobSource?.trim() || null;

  if (externalId && source) {
    const byExternal = await prisma.jobDescriptionInsight.findUnique({
      where: {
        jobExternalId_jobSource: { jobExternalId: externalId, jobSource: source },
      },
    });
    if (byExternal) {
      return mapInsightRow(byExternal, true);
    }
  }

  if (externalId) {
    const byExternalId = await prisma.jobDescriptionInsight.findFirst({
      where: { jobExternalId: externalId },
      orderBy: { analyzedAt: "desc" },
    });
    if (byExternalId) {
      return mapInsightRow(byExternalId, true);
    }
  }

  const byFingerprint = await prisma.jobDescriptionInsight.findUnique({
    where: { descriptionFingerprint: fingerprint },
  });
  if (byFingerprint) {
    return mapInsightRow(byFingerprint, true);
  }

  const icp = await extractIdealCandidateProfile(jdText, {
    title: input.title ?? undefined,
    company: input.company ?? undefined,
  });

  const keywords = icp.keywordsForAts;
  const now = new Date();

  try {
    const created = await prisma.jobDescriptionInsight.create({
      data: {
        jobExternalId: externalId,
        jobSource: source,
        descriptionFingerprint: fingerprint,
        title: input.title?.trim() || null,
        company: input.company?.trim() || null,
        icpJson: icp,
        keywordsJson: keywords,
        analyzedAt: now,
      },
    });
    return mapInsightRow(created, false);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      const existing =
        (externalId && source
          ? await prisma.jobDescriptionInsight.findUnique({
              where: {
                jobExternalId_jobSource: {
                  jobExternalId: externalId,
                  jobSource: source,
                },
              },
            })
          : null) ??
        (await prisma.jobDescriptionInsight.findUnique({
          where: { descriptionFingerprint: fingerprint },
        }));
      if (existing) {
        return mapInsightRow(existing, true);
      }
    }
    if (err instanceof IcpExtractionError) throw err;
    throw err;
  }
}

export { IcpExtractionError };
