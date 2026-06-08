import type { Profile } from "@/generated/prisma";
import { experienceEntrySchema, profileQuizSchema } from "@/lib/validators/profile";

import { computeRoleFitsUser } from "./role-fits-user";
import type {
  ExperienceEntry,
  JobMatchInput,
  JobMatchResult,
  MatchBreakdown,
  ProfilePreferencesInput,
} from "./types";
import { computeUserFitsRole } from "./user-fits-role";

export { computeMatchScore, computeUserFitsRole, resetGroqCallCounter } from "./user-fits-role";
export { computeCareerTrajectory, computeRoleFitsUser } from "./role-fits-user";
export {
  buildTemplatedRoleFitExplanation,
  generateRoleFitExplanation,
} from "./explain-role-fit";
export type {
  CareerTrajectory,
  CareerTrajectoryLabel,
  ExperienceEntry,
  JobMatchInput,
  JobMatchResult,
  MatchBreakdown,
  ProfilePreferencesInput,
} from "./types";
export { matchBreakdownSchema } from "./types";

export function profileToPreferences(profile: Profile | null): ProfilePreferencesInput {
  if (!profile) return {};

  let quiz: { workMode?: string; priorities?: string[] } = {};
  if (profile.quizJson && typeof profile.quizJson === "object") {
    const parsed = profileQuizSchema.safeParse(profile.quizJson);
    if (parsed.success) quiz = parsed.data;
  }

  let experienceJson: ExperienceEntry[] | undefined;
  if (Array.isArray(profile.experienceJson)) {
    const parsed = experienceEntrySchema.array().safeParse(profile.experienceJson);
    if (parsed.success) experienceJson = parsed.data;
  }

  return {
    aspiringRole: profile.aspiringRole,
    personalityType: profile.personalityType,
    targetSeniority: profile.targetSeniority,
    employmentTypePreference: profile.employmentTypePreference,
    relocationWillingness: profile.relocationWillingness,
    salaryMin: profile.salaryMin,
    salaryMax: profile.salaryMax,
    salaryCurrency: profile.salaryCurrency,
    city: profile.city,
    region: profile.region,
    country: profile.country,
    workMode: quiz.workMode as ProfilePreferencesInput["workMode"],
    priorities: quiz.priorities,
    experienceJson,
  };
}

export function computeOverallFit(
  userFitsRole: number,
  roleFitsUser: number | null,
): number {
  if (roleFitsUser === null) return userFitsRole;

  let overall = Math.round(0.5 * userFitsRole + 0.5 * roleFitsUser);
  if (userFitsRole < 40 || roleFitsUser < 40) {
    overall = Math.min(overall, 55);
  }
  return overall;
}

function buildOverallSummary(
  userFitsRole: number,
  roleFitsUser: number | null,
  overall: number,
): string {
  if (roleFitsUser === null) {
    return `Overall ${overall}% — based on how your CV matches this role. Add preferences to see role-fit.`;
  }
  return `Overall ${overall}% — you fit the role ${userFitsRole}%; the role fits you ${roleFitsUser}%.`;
}

export async function computeJobMatch(
  resumeSkills: string[],
  resumeText: string,
  profile: Profile | null,
  job: JobMatchInput,
): Promise<JobMatchResult> {
  const prefs = profileToPreferences(profile);

  const userFitsRole = await computeUserFitsRole(
    resumeSkills,
    resumeText,
    job.title,
    job.description,
    job.requiredSkills,
  );

  const roleFitsUser = computeRoleFitsUser(prefs, job);
  const overallFitScore = computeOverallFit(userFitsRole.score, roleFitsUser.score);

  const breakdown: MatchBreakdown = {
    userFitsRole,
    roleFitsUser,
    overallSummary: buildOverallSummary(
      userFitsRole.score,
      roleFitsUser.score,
      overallFitScore,
    ),
  };

  return {
    userFitsRoleScore: userFitsRole.score,
    roleFitsUserScore: roleFitsUser.score,
    overallFitScore,
    matchReason: breakdown.overallSummary ?? "",
    breakdown,
  };
}
