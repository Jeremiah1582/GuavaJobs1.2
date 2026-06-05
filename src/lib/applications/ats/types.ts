import type {
  IdealCandidateProfile,
  IcpMatchReport,
  MatchStatus,
} from "../job-insights/types";

export type JobRequirements = {
  title: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  seniority: string | null;
  summary: string;
};

export type KeywordBuckets = {
  required: string[];
  preferred: string[];
};

export type KeywordMatchJson = {
  present: string[];
  missing: string[];
};

export type ApplicationAtsReportDto = {
  applicationId: string;
  overallScore: number;
  overallStatus: MatchStatus;
  letterScore: number | null;
  cvScore: number | null;
  requirements: JobRequirements;
  keywords: KeywordBuckets;
  letterMatch: KeywordMatchJson;
  cvMatch: KeywordMatchJson;
  icp: IdealCandidateProfile | null;
  icpMatch: IcpMatchReport | null;
  tips: string[];
  analyzedAt: string;
  updatedAt: string;
};

export type AtsGenerationContext = {
  missingKeywords: string[];
  requiredKeywords: string[];
  summaryRequirements: string;
  topGaps: string[];
  cvEmphasis: string[];
  coverLetterThemes: string[];
  mustHaveSkillsMissing: string[];
};

export type AtsRecomputeTrigger =
  | "application.created"
  | "letter.generated"
  | "letter.saved"
  | "resume.linked"
  | "manual.refresh";
