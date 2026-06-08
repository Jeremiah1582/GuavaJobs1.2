import { z } from "zod";

export const matchDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  score: z.number().int().min(0).max(100),
  matched: z.boolean(),
  detail: z.string(),
});

export const userFitsRoleBreakdownSchema = z.object({
  score: z.number().int(),
  reason: z.string(),
  matchedSkills: z.array(z.string()).optional(),
  missingSkills: z.array(z.string()).optional(),
});

export const roleFitsUserBreakdownSchema = z.object({
  score: z.number().int().nullable(),
  reason: z.string(),
  explanation: z.string().optional(),
  dimensions: z.array(matchDimensionSchema),
});

export const matchBreakdownSchema = z.object({
  userFitsRole: userFitsRoleBreakdownSchema,
  roleFitsUser: roleFitsUserBreakdownSchema,
  overallSummary: z.string().optional(),
});

export type MatchDimension = z.infer<typeof matchDimensionSchema>;
export type UserFitsRoleBreakdown = z.infer<typeof userFitsRoleBreakdownSchema>;
export type RoleFitsUserBreakdown = z.infer<typeof roleFitsUserBreakdownSchema>;
export type MatchBreakdown = z.infer<typeof matchBreakdownSchema>;

export type ExperienceEntry = {
  role: string;
  company: string;
  startDate: string;
  endDate?: string;
  bullets?: string[];
};

export type CareerTrajectoryLabel =
  | "Step forward"
  | "Lateral move"
  | "Tangential"
  | "Different direction";

export type CareerTrajectory = {
  score: number;
  label: CareerTrajectoryLabel;
  detail: string;
  aspirationAlignment: number;
  domainContinuity: number;
  seniorityProgression: number;
};

export type ProfilePreferencesInput = {
  aspiringRole?: string | null;
  personalityType?: string | null;
  targetSeniority?: string | null;
  employmentTypePreference?: string | null;
  relocationWillingness?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  workMode?: "remote" | "hybrid" | "onsite" | "flexible" | null;
  priorities?: string[];
  experienceJson?: ExperienceEntry[];
};

export type JobMatchInput = {
  title: string;
  company?: string;
  location: string;
  locationType: string;
  description: string;
  requiredSkills: string[];
};

export type JobMatchResult = {
  userFitsRoleScore: number;
  roleFitsUserScore: number | null;
  overallFitScore: number;
  matchReason: string;
  breakdown: MatchBreakdown;
};
