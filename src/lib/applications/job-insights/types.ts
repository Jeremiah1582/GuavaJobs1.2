import { z } from "zod";

export const senioritySchema = z
  .enum(["intern", "junior", "mid", "senior", "lead"])
  .nullable();

export const idealCandidateProfileSchema = z.object({
  roleSummary: z.string(),
  seniority: senioritySchema,
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  experience: z.object({
    minYears: z.number().nullable(),
    domains: z.array(z.string()),
    evidencePhrases: z.array(z.string()),
  }),
  education: z.object({
    required: z.boolean(),
    levels: z.array(z.string()),
    fields: z.array(z.string()),
  }),
  qualifications: z.array(z.string()),
  softTraits: z.array(z.string()),
  keyResponsibilities: z.array(z.string()),
  cvEmphasis: z.array(z.string()),
  coverLetterThemes: z.array(z.string()),
  keywordsForAts: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
});

export type IdealCandidateProfile = z.infer<typeof idealCandidateProfileSchema>;

export const matchStatusSchema = z.enum(["met", "partial", "missing"]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const dimensionMatchSchema = z.object({
  status: matchStatusSchema,
  score: z.number(),
  met: z.array(z.string()),
  partial: z.array(z.string()),
  missing: z.array(z.string()),
  evidence: z.string().optional(),
  gap: z.string().optional(),
});

export type DimensionMatch = z.infer<typeof dimensionMatchSchema>;

export const icpMatchReportSchema = z.object({
  overallStatus: matchStatusSchema,
  overallScore: z.number(),
  dimensions: z.object({
    skills: dimensionMatchSchema,
    experience: dimensionMatchSchema,
    education: dimensionMatchSchema,
    seniority: dimensionMatchSchema,
    qualifications: dimensionMatchSchema,
  }),
  topGaps: z.array(z.string()),
  topStrengths: z.array(z.string()),
});

export type IcpMatchReport = z.infer<typeof icpMatchReportSchema>;

export type JobInsightDto = {
  id: string;
  jobExternalId: string | null;
  jobSource: string | null;
  title: string | null;
  company: string | null;
  icp: IdealCandidateProfile;
  keywords: { required: string[]; preferred: string[] };
  modelVersion: string;
  analyzedAt: string;
  cached: boolean;
};

export const EMPTY_ICP: IdealCandidateProfile = {
  roleSummary: "",
  seniority: null,
  mustHaveSkills: [],
  niceToHaveSkills: [],
  experience: { minYears: null, domains: [], evidencePhrases: [] },
  education: { required: false, levels: [], fields: [] },
  qualifications: [],
  softTraits: [],
  keyResponsibilities: [],
  cvEmphasis: [],
  coverLetterThemes: [],
  keywordsForAts: { required: [], preferred: [] },
};
