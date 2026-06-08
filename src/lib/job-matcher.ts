// Re-export bidirectional job matcher (backward-compatible entry point)
export {
  computeJobMatch,
  computeMatchScore,
  computeOverallFit,
  computeRoleFitsUser,
  computeUserFitsRole,
  profileToPreferences,
  resetGroqCallCounter,
  buildTemplatedRoleFitExplanation,
  generateRoleFitExplanation,
} from "./job-matcher/index";
export type {
  JobMatchInput,
  JobMatchResult,
  MatchBreakdown,
  ProfilePreferencesInput,
} from "./job-matcher/types";
