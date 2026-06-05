import { chatCompletion } from "@/lib/ai/client";
import type { JobRequirements, KeywordBuckets } from "./types";

const EMPTY_REQUIREMENTS: JobRequirements = {
  title: "",
  mustHaveSkills: [],
  niceToHaveSkills: [],
  seniority: null,
  summary: "",
};

function fallbackKeywords(jdText: string): KeywordBuckets {
  const tokens = jdText
    .toLowerCase()
    .match(/\b[a-z][a-z0-9+#.]{2,}\b/g) ?? [];
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "will",
    "our",
    "this",
    "that",
    "from",
    "have",
    "are",
    "job",
    "role",
    "team",
    "work",
    "experience",
    "skills",
    "ability",
    "required",
    "preferred",
  ]);
  const freq = new Map<string, number>();
  for (const token of tokens) {
    if (stop.has(token)) continue;
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
  const required = ranked.slice(0, 8).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const preferred = ranked.slice(8, 14).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return { required, preferred };
}

function parseRequirements(raw: unknown): JobRequirements {
  if (!raw || typeof raw !== "object") return EMPTY_REQUIREMENTS;
  const row = raw as Record<string, unknown>;
  const mustHave = Array.isArray(row.mustHaveSkills)
    ? row.mustHaveSkills.filter((v): v is string => typeof v === "string")
    : [];
  const niceToHave = Array.isArray(row.niceToHaveSkills)
    ? row.niceToHaveSkills.filter((v): v is string => typeof v === "string")
    : [];
  return {
    title: typeof row.title === "string" ? row.title.trim() : "",
    mustHaveSkills: mustHave.map((s) => s.trim()).filter(Boolean),
    niceToHaveSkills: niceToHave.map((s) => s.trim()).filter(Boolean),
    seniority: typeof row.seniority === "string" ? row.seniority.trim() || null : null,
    summary: typeof row.summary === "string" ? row.summary.trim() : "",
  };
}

export async function analyzeJobRequirements(
  jdText: string,
): Promise<{ requirements: JobRequirements; keywords: KeywordBuckets }> {
  const trimmed = jdText.trim();
  if (!trimmed) {
    return { requirements: EMPTY_REQUIREMENTS, keywords: { required: [], preferred: [] } };
  }

  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "Extract structured hiring requirements from job descriptions. Return JSON only.",
        },
        {
          role: "user",
          content: `Analyze this job description and return JSON:
{
  "title": "<role title>",
  "mustHaveSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill3"],
  "seniority": "<intern|junior|mid|senior|lead|null>",
  "summary": "<1-2 sentence role summary>"
}

Job description:
${trimmed.slice(0, 12_000)}`,
        },
      ],
      responseFormat: "json_object",
      temperature: 0.2,
    });

    const parsed = JSON.parse(raw) as unknown;
    const requirements = parseRequirements(parsed);
    const keywords: KeywordBuckets = {
      required: requirements.mustHaveSkills,
      preferred: requirements.niceToHaveSkills,
    };

    if (keywords.required.length === 0 && keywords.preferred.length === 0) {
      const fallback = fallbackKeywords(trimmed);
      return {
        requirements: {
          ...requirements,
          mustHaveSkills: fallback.required,
          niceToHaveSkills: fallback.preferred,
        },
        keywords: fallback,
      };
    }

    return { requirements, keywords };
  } catch {
    const fallback = fallbackKeywords(trimmed);
    return {
      requirements: {
        title: "",
        mustHaveSkills: fallback.required,
        niceToHaveSkills: fallback.preferred,
        seniority: null,
        summary: "Requirements extracted from job description keywords.",
      },
      keywords: fallback,
    };
  }
}
