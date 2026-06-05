import { recomputeReport } from "./recompute";
import type { AtsRecomputeTrigger } from "./types";

export function scheduleAtsRecompute(
  userId: string,
  applicationId: string,
  trigger: AtsRecomputeTrigger,
): void {
  void recomputeReport(userId, applicationId, trigger).catch((err) => {
    console.error(`[application-ats:${trigger}]`, applicationId, err);
  });
}

export {
  analyzeJobRequirements,
} from "./analyze-job";
export { gatherApplicationTexts } from "./gather-texts";
export { buildTips, computeScores } from "./compute-scores";
export {
  getAtsContextForGeneration,
  getAtsGenerationContext,
  getReportForApplication,
  recomputeReport,
} from "./recompute";
export { safeRecomputeReport } from "./hooks";

export type {
  ApplicationAtsReportDto,
  AtsGenerationContext,
  AtsRecomputeTrigger,
  JobRequirements,
  KeywordBuckets,
  KeywordMatchJson,
} from "./types";

export { AtsServiceError } from "./errors";
