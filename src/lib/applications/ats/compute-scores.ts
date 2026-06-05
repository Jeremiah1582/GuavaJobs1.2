import {
  computeOverallScore,
  scoreKeywordMatch,
} from "@/lib/ats/keyword-match";
import type { IcpMatchReport } from "../job-insights/types";
import type {
  JobRequirements,
  KeywordBuckets,
  KeywordMatchJson,
} from "./types";

export function computeScores(
  keywords: KeywordBuckets,
  letterText: string,
  cvText: string,
): {
  letterScore: number | null;
  cvScore: number | null;
  overallScore: number;
  letterMatch: KeywordMatchJson;
  cvMatch: KeywordMatchJson;
} {
  const letterResult = letterText.trim()
    ? scoreKeywordMatch(letterText, keywords.required, keywords.preferred)
    : null;
  const cvResult = cvText.trim()
    ? scoreKeywordMatch(cvText, keywords.required, keywords.preferred)
    : null;

  const letterScore = letterResult?.score ?? null;
  const cvScore = cvResult?.score ?? null;
  const overallScore = computeOverallScore(letterScore, cvScore);

  return {
    letterScore,
    cvScore,
    overallScore,
    letterMatch: {
      present: letterResult?.present ?? [],
      missing: letterResult?.missing ?? [],
    },
    cvMatch: {
      present: cvResult?.present ?? [],
      missing: cvResult?.missing ?? [],
    },
  };
}

export function buildTips(
  requirements: JobRequirements,
  letterMatch: KeywordMatchJson,
  cvMatch: KeywordMatchJson,
  icpMatch?: IcpMatchReport | null,
): string[] {
  const tips: string[] = [];

  for (const gap of icpMatch?.topGaps.slice(0, 2) ?? []) {
    tips.push(gap);
  }

  const letterMissing = letterMatch.missing.slice(0, 3);
  const cvMissing = cvMatch.missing.slice(0, 3);

  for (const keyword of letterMissing) {
    if (tips.length >= 4) break;
    tips.push(`Add "${keyword}" to your cover letter intro or skills paragraph.`);
  }

  for (const keyword of cvMissing) {
    if (tips.length >= 4) break;
    if (!letterMissing.includes(keyword)) {
      tips.push(`Your CV does not mention "${keyword}" — add it if you have the experience.`);
    }
  }

  if (requirements.seniority && tips.length < 4) {
    tips.push(
      `This role targets ${requirements.seniority} level — align your examples to that seniority.`,
    );
  }

  if (requirements.summary && tips.length < 4) {
    tips.push(`Role focus: ${requirements.summary}`);
  }

  if (tips.length === 0) {
    tips.push("Strong match — tailor examples to the company and role before you apply.");
  }

  return tips.slice(0, 4);
}
