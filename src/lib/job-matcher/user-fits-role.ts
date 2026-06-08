import { textContainsKeyword } from "@/lib/ats/keyword-match";
import { complete, parseJSON, MODEL_FAST } from "@/lib/llm";
import { resumeTextForAI } from "@/lib/pdf-extract.server";

import type { UserFitsRoleBreakdown } from "./types";

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ["js", "ecmascript", "node", "nodejs", "node.js"],
  typescript: ["ts"],
  python: ["py"],
  react: ["reactjs", "react.js"],
  kubernetes: ["k8s"],
  postgresql: ["postgres", "psql"],
  mongodb: ["mongo"],
};

function expandSkillTerms(skill: string): string[] {
  const normalized = skill.trim().toLowerCase();
  const terms = new Set<string>([normalized, skill]);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (
      normalized === canonical ||
      aliases.some((a) => normalized === a || normalized.includes(a))
    ) {
      terms.add(canonical);
      for (const alias of aliases) terms.add(alias);
    }
  }
  return [...terms];
}

function skillMatches(resumeSkills: string[], resumeText: string, skill: string): boolean {
  const terms = expandSkillTerms(skill);
  const resumeLower = resumeSkills.map((s) => s.toLowerCase());
  if (terms.some((t) => resumeLower.includes(t))) return true;
  return terms.some((t) => textContainsKeyword(resumeText, t));
}

let llmCallsThisRun = 0;
const MAX_LLM_CALLS_PER_RUN = 15;

export function resetGroqCallCounter() {
  llmCallsThisRun = 0;
}

export async function computeUserFitsRole(
  resumeSkills: string[],
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
): Promise<UserFitsRoleBreakdown> {
  const reqLower = requiredSkills.map((s) => s.toLowerCase());

  const matchingSkills = requiredSkills.filter((s) =>
    skillMatches(resumeSkills, resumeText, s),
  );
  const missingSkills = requiredSkills.filter(
    (s) => !skillMatches(resumeSkills, resumeText, s),
  );

  const keywordScore =
    reqLower.length > 0
      ? Math.round((matchingSkills.length / reqLower.length) * 100)
      : 40;

  const shouldCallLlm =
    keywordScore >= 30 &&
    llmCallsThisRun < MAX_LLM_CALLS_PER_RUN &&
    reqLower.length > 0 &&
    resumeText.length > 100;

  if (!shouldCallLlm) {
    const matched = matchingSkills.slice(0, 4);
    const missing = missingSkills.slice(0, 3);
    const reason =
      keywordScore >= 30
        ? `Matched ${matchingSkills.length}/${reqLower.length} required skills (${matched.join(", ")}).${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}`
        : `Low skill overlap — ${matchingSkills.length} of ${reqLower.length} required skills found.`;
    return {
      score: keywordScore,
      reason,
      matchedSkills: matchingSkills,
      missingSkills,
    };
  }

  llmCallsThisRun++;

  const prompt = `Score resume-job fit 0-100. Reply ONLY JSON: {"score":<int>,"reason":"<max 15 words>"}

Job: ${jobTitle}
Required: ${requiredSkills.slice(0, 8).join(", ")}
Candidate skills: ${resumeSkills.slice(0, 12).join(", ")}
Resume excerpt: ${resumeTextForAI(resumeText, 3500)}`;

  try {
    const raw = await complete(prompt, undefined, 0.1, MODEL_FAST, 80);
    const result = parseJSON(raw, null) as { score?: number; reason?: string } | null;

    if (!result?.score) throw new Error("bad response");

    return {
      score: Math.min(100, Math.max(0, Number(result.score))),
      reason: result.reason ?? `${matchingSkills.length}/${reqLower.length} skills matched.`,
      matchedSkills: matchingSkills,
      missingSkills,
    };
  } catch {
    return {
      score: keywordScore,
      reason: `${matchingSkills.length} of ${reqLower.length} required skills matched.`,
      matchedSkills: matchingSkills,
      missingSkills,
    };
  }
}

/** @deprecated Use computeUserFitsRole */
export async function computeMatchScore(
  resumeSkills: string[],
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
): Promise<{ score: number; reason: string }> {
  const result = await computeUserFitsRole(
    resumeSkills,
    resumeText,
    jobTitle,
    jobDescription,
    requiredSkills,
  );
  return { score: result.score, reason: result.reason };
}
