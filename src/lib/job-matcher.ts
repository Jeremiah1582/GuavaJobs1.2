// src/lib/job-matcher.ts
// Rate-limit aware match scorer:
// - Keyword-only path: zero Groq calls (fast, free)
// - Groq path: only for matches ≥ 30% keyword overlap, uses fast 8b model, short prompt

import { complete, parseJSON, MODEL_FAST } from "./groq";

// Simple in-process rate limiter — max N Groq calls per scrape run
let groqCallsThisRun = 0;
const MAX_GROQ_CALLS_PER_RUN = 15; // safe for free tier (30 req/min, we batch slowly)

export function resetGroqCallCounter() {
  groqCallsThisRun = 0;
}

export async function computeMatchScore(
  resumeSkills: string[],
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<{ score: number; reason: string }> {

  // ── Step 1: Keyword score (always, zero API cost) ──
  const resumeLower = resumeSkills.map(s => s.toLowerCase());
  const reqLower    = requiredSkills.map(s => s.toLowerCase());

  // Also scan raw resume text for skills not in structured list
  const resumeTextLower = resumeText.toLowerCase();

  const matchingSkills = reqLower.filter(s =>
    resumeLower.includes(s) || resumeTextLower.includes(s)
  );

  const keywordScore = reqLower.length > 0
    ? Math.round((matchingSkills.length / reqLower.length) * 100)
    : 40; // no required skills listed = neutral score

  // ── Step 2: Decide whether Groq is worth calling ──
  // Skip Groq if: poor match, quota exhausted, or no required skills to compare
  const shouldCallGroq =
    keywordScore >= 30 &&               // only meaningful matches
    groqCallsThisRun < MAX_GROQ_CALLS_PER_RUN &&
    reqLower.length > 0 &&
    resumeText.length > 100;

  if (!shouldCallGroq) {
    // Pure keyword score with a readable reason
    const matched   = matchingSkills.slice(0, 4);
    const missing   = reqLower.filter(s => !resumeLower.includes(s) && !resumeTextLower.includes(s)).slice(0, 3);
    const reason =
      keywordScore >= 30
        ? `Matched ${matchingSkills.length}/${reqLower.length} required skills (${matched.join(", ")}).${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}`
        : `Low skill overlap — ${matchingSkills.length} of ${reqLower.length} required skills found.`;
    return { score: keywordScore, reason };
  }

  // ── Step 3: Fast Groq call — short prompt, 8b model, 150 token response ──
  groqCallsThisRun++;

  // Keep prompt very short — we're paying per token on free tier
  const prompt = `Score resume-job fit 0-100. Reply ONLY JSON: {"score":<int>,"reason":"<max 15 words>"}

Job: ${jobTitle}
Required: ${requiredSkills.slice(0, 8).join(", ")}
Candidate skills: ${resumeSkills.slice(0, 12).join(", ")}
Resume excerpt: ${resumeText.slice(0, 400)}`;

  try {
    const raw    = await complete(prompt, undefined, 0.1, MODEL_FAST, 80);
    const result = parseJSON(raw, null);

    if (!result?.score) throw new Error("bad response");

    return {
      score:  Math.min(100, Math.max(0, Number(result.score))),
      reason: result.reason ?? `${matchingSkills.length}/${reqLower.length} skills matched.`,
    };
  } catch {
    // Groq failed — fall back to keyword score silently
    return {
      score:  keywordScore,
      reason: `${matchingSkills.length} of ${reqLower.length} required skills matched.`,
    };
  }
}