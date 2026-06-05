import { createHash } from "node:crypto";
import { prisma } from "@/db";
import { ApiErrorCode } from "@/lib/api/errors";
import { applicationsService } from "../service";
import { resolveJobDescriptionForApplication } from "../snapshots";
import {
  getOrCreateJobInsight,
  IcpExtractionError,
  matchIcpToProfile,
  icpMatchReportSchema,
  idealCandidateProfileSchema,
  type IdealCandidateProfile,
  type IcpMatchReport,
} from "../job-insights";
import { buildTips, computeScores } from "./compute-scores";
import { gatherApplicationTexts } from "./gather-texts";
import { AtsServiceError } from "./errors";
import type {
  ApplicationAtsReportDto,
  AtsGenerationContext,
  AtsRecomputeTrigger,
  JobRequirements,
  KeywordBuckets,
  KeywordMatchJson,
} from "./types";

function excerpt(text: string, max = 4000): string {
  return text.trim().slice(0, max);
}

function buildFingerprint(
  jdText: string,
  letterText: string,
  cvText: string,
  icpFingerprint: string,
): string {
  return createHash("sha256")
    .update(
      [excerpt(jdText), excerpt(letterText), excerpt(cvText), icpFingerprint].join(
        "\n---\n",
      ),
    )
    .digest("hex");
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value as T;
}

function icpToJobRequirements(icp: IdealCandidateProfile): JobRequirements {
  return {
    title: icp.roleSummary.split(".")[0]?.trim() ?? "",
    mustHaveSkills: icp.mustHaveSkills,
    niceToHaveSkills: icp.niceToHaveSkills,
    seniority: icp.seniority,
    summary: icp.roleSummary,
  };
}

function blendOverallScore(
  icpScore: number,
  channelScore: number,
  hasDocuments: boolean,
): number {
  if (!hasDocuments) return icpScore;
  return Math.round(0.6 * icpScore + 0.4 * channelScore);
}

function mapReportRow(
  row: {
    applicationId: string;
    overallScore: number;
    letterScore: number | null;
    cvScore: number | null;
    requirementsJson: unknown;
    keywordsJson: unknown;
    letterMatchJson: unknown;
    cvMatchJson: unknown;
    icpMatchJson: unknown;
    tipsJson: unknown;
    analyzedAt: Date;
    updatedAt: Date;
  },
  icp: IdealCandidateProfile | null,
): ApplicationAtsReportDto {
  const icpMatchParsed = icpMatchReportSchema.safeParse(row.icpMatchJson);
  const icpMatch: IcpMatchReport | null = icpMatchParsed.success
    ? icpMatchParsed.data
    : null;

  return {
    applicationId: row.applicationId,
    overallScore: row.overallScore,
    overallStatus: icpMatch?.overallStatus ?? "partial",
    letterScore: row.letterScore,
    cvScore: row.cvScore,
    requirements: parseJsonField<JobRequirements>(row.requirementsJson, {
      title: "",
      mustHaveSkills: [],
      niceToHaveSkills: [],
      seniority: null,
      summary: "",
    }),
    keywords: parseJsonField<KeywordBuckets>(row.keywordsJson, {
      required: [],
      preferred: [],
    }),
    letterMatch: parseJsonField<KeywordMatchJson>(row.letterMatchJson, {
      present: [],
      missing: [],
    }),
    cvMatch: parseJsonField<KeywordMatchJson>(row.cvMatchJson, {
      present: [],
      missing: [],
    }),
    icp,
    icpMatch,
    tips: parseJsonField<string[]>(row.tipsJson, []),
    analyzedAt: row.analyzedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadIcpForApplication(
  applicationId: string,
): Promise<IdealCandidateProfile | null> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      jobInsight: {
        select: { icpJson: true },
      },
    },
  });
  if (!application?.jobInsight?.icpJson) return null;
  const parsed = idealCandidateProfileSchema.safeParse(application.jobInsight.icpJson);
  return parsed.success ? parsed.data : null;
}

export async function getReportForApplication(
  userId: string,
  applicationId: string,
): Promise<ApplicationAtsReportDto | null> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!application) return null;

  const row = await prisma.applicationAtsReport.findUnique({
    where: { applicationId },
  });
  if (!row) return null;

  const icp = await loadIcpForApplication(applicationId);
  return mapReportRow(row, icp);
}

export async function getAtsGenerationContext(
  userId: string,
  applicationId: string,
): Promise<AtsGenerationContext | null> {
  const report = await getReportForApplication(userId, applicationId);
  if (!report) return null;

  const missingKeywords = [
    ...new Set([...report.letterMatch.missing, ...report.cvMatch.missing]),
  ].slice(0, 8);

  const mustHaveSkillsMissing =
    report.icpMatch?.dimensions.skills.missing ??
    report.icp?.mustHaveSkills.filter(
      (s) => !report.letterMatch.present.includes(s) && !report.cvMatch.present.includes(s),
    ) ??
    [];

  return {
    missingKeywords,
    requiredKeywords: report.keywords.required,
    summaryRequirements: report.requirements.summary,
    topGaps: report.icpMatch?.topGaps ?? missingKeywords.slice(0, 5),
    cvEmphasis: report.icp?.cvEmphasis ?? [],
    coverLetterThemes: report.icp?.coverLetterThemes ?? [],
    mustHaveSkillsMissing: mustHaveSkillsMissing.slice(0, 5),
  };
}

/** @alias getAtsGenerationContext */
export const getAtsContextForGeneration = getAtsGenerationContext;

export async function recomputeReport(
  userId: string,
  applicationId: string,
  _trigger: AtsRecomputeTrigger,
): Promise<ApplicationAtsReportDto> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });

  if (!application) {
    throw new AtsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }

  const { application: hydrated, jdText } = await resolveJobDescriptionForApplication(
    userId,
    application,
  );

  if (!jdText?.trim()) {
    throw new AtsServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "Job description required for ICP analysis",
      422,
      "Add a job description to this application before analyzing fit.",
    );
  }

  let jobInsight;
  try {
    jobInsight = await getOrCreateJobInsight({
      jdText,
      jobExternalId: hydrated.jobExternalId,
      jobSource: hydrated.source,
      title: hydrated.title,
      company: hydrated.company,
    });
  } catch (err) {
    if (err instanceof IcpExtractionError) {
      throw new AtsServiceError(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        err.message,
        502,
        "Could not analyze the job description. Try again shortly.",
      );
    }
    throw err;
  }

  if (hydrated.jobInsightId !== jobInsight.id) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { jobInsightId: jobInsight.id },
    });
  }

  const bundle = await applicationsService.getBundleForUser(userId, applicationId);
  const { letterText, cvText } = await gatherApplicationTexts(userId, bundle);
  const profileSnapshot = bundle.profileSnapshot;

  let icpMatch: IcpMatchReport | null = null;
  if (profileSnapshot) {
    icpMatch = matchIcpToProfile(jobInsight.icp, profileSnapshot, cvText || undefined);
  }

  const keywords = jobInsight.keywords.required.length
    ? jobInsight.keywords
    : jobInsight.icp.keywordsForAts;
  const requirements = icpToJobRequirements(jobInsight.icp);

  const fingerprint = buildFingerprint(
    jdText,
    letterText,
    cvText,
    jobInsight.id,
  );

  const existing = await prisma.applicationAtsReport.findUnique({
    where: { applicationId },
    select: { inputFingerprint: true },
  });

  if (existing?.inputFingerprint === fingerprint && icpMatch) {
    const row = await prisma.applicationAtsReport.findUnique({
      where: { applicationId },
    });
    if (row) {
      return mapReportRow(row, jobInsight.icp);
    }
  }

  const scores = computeScores(keywords, letterText, cvText);
  const hasDocuments = Boolean(letterText.trim() || cvText.trim());
  const icpScore = icpMatch?.overallScore ?? 0;
  const overallScore = blendOverallScore(icpScore, scores.overallScore, hasDocuments);
  const tips = buildTips(requirements, scores.letterMatch, scores.cvMatch, icpMatch);
  const now = new Date();

  const row = await prisma.applicationAtsReport.upsert({
    where: { applicationId },
    create: {
      applicationId,
      overallScore,
      letterScore: scores.letterScore,
      cvScore: scores.cvScore,
      requirementsJson: requirements,
      keywordsJson: keywords,
      letterMatchJson: scores.letterMatch,
      cvMatchJson: scores.cvMatch,
      icpMatchJson: icpMatch ?? {},
      tipsJson: tips,
      inputFingerprint: fingerprint,
      analyzedAt: now,
      updatedAt: now,
    },
    update: {
      overallScore,
      letterScore: scores.letterScore,
      cvScore: scores.cvScore,
      requirementsJson: requirements,
      keywordsJson: keywords,
      letterMatchJson: scores.letterMatch,
      cvMatchJson: scores.cvMatch,
      icpMatchJson: icpMatch ?? {},
      tipsJson: tips,
      inputFingerprint: fingerprint,
      analyzedAt: now,
      updatedAt: now,
    },
  });

  return mapReportRow(row, jobInsight.icp);
}
