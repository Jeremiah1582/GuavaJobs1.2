import type { JobListItem } from "@/lib/jobs/list-items";
import type { RankedGlobalJob } from "@/lib/jobs/search/rank-jobs";

/**
 * Blend discovery rank (taxonomy + bridge mix) with match scores.
 * Preserves ranked order when scores are missing or tied.
 */
export function sortJobListItems(
  items: JobListItem[],
  ranked: RankedGlobalJob[],
): JobListItem[] {
  const rankIndex = new Map(ranked.map((r, i) => [r.job.id, i]));
  const rankScore = new Map(ranked.map((r) => [r.job.id, r.rankScore]));

  return [...items].sort((a, b) => {
    const aScore = a.overallFitScore;
    const bScore = b.overallFitScore;
    if (aScore != null && bScore != null && aScore !== bScore) {
      return bScore - aScore;
    }
    if (aScore != null && bScore == null) return -1;
    if (aScore == null && bScore != null) return 1;

    const aRank = rankScore.get(a.id) ?? 0;
    const bRank = rankScore.get(b.id) ?? 0;
    if (aRank !== bRank) return bRank - aRank;

    return (rankIndex.get(a.id) ?? 9999) - (rankIndex.get(b.id) ?? 9999);
  });
}
