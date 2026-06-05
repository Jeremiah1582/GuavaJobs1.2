export { extractIdealCandidateProfile, IcpExtractionError } from "./analyze";
export { descriptionFingerprint } from "./fingerprint";
export { matchIcpToProfile } from "./match-icp";
export { getOrCreateJobInsight } from "./service";
export type { GetOrCreateJobInsightInput } from "./service";

export type {
  DimensionMatch,
  IdealCandidateProfile,
  IcpMatchReport,
  JobInsightDto,
  MatchStatus,
} from "./types";

export {
  EMPTY_ICP,
  idealCandidateProfileSchema,
  icpMatchReportSchema,
  matchStatusSchema,
} from "./types";
