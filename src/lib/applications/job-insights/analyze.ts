import { chatCompletion } from "@/lib/ai/client";
import {
  EMPTY_ICP,
  idealCandidateProfileSchema,
  type IdealCandidateProfile,
} from "./types";

function parseIcp(raw: unknown): IdealCandidateProfile {
  const parsed = idealCandidateProfileSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return EMPTY_ICP;
}

export class IcpExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IcpExtractionError";
  }
}

export async function extractIdealCandidateProfile(
  jdText: string,
  meta?: { title?: string; company?: string },
): Promise<IdealCandidateProfile> {
  const trimmed = jdText.trim();
  if (!trimmed) return EMPTY_ICP;

  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "You are a hiring analyst. From this job description, infer the Ideal Candidate Profile (ICP) the lister wants. Return JSON only.",
        },
        {
          role: "user",
          content: `Analyze this job description and return JSON matching this shape:
{
  "roleSummary": "<1-2 sentence summary of ideal candidate>",
  "seniority": "<intern|junior|mid|senior|lead|null>",
  "mustHaveSkills": ["deal-breaker skills"],
  "niceToHaveSkills": ["preferred skills"],
  "experience": {
    "minYears": <number or null>,
    "domains": ["e.g. fintech, B2B SaaS"],
    "evidencePhrases": ["how JD describes ideal background"]
  },
  "education": {
    "required": <boolean>,
    "levels": ["e.g. Bachelor's in CS"],
    "fields": ["e.g. Computer Science"]
  },
  "qualifications": ["certs, work rights, etc."],
  "softTraits": ["collaborative", "self-starter"],
  "keyResponsibilities": ["main duties"],
  "cvEmphasis": ["what ideal CV should highlight"],
  "coverLetterThemes": ["narratives recruiter expects"],
  "keywordsForAts": { "required": ["keyword1"], "preferred": ["keyword2"] }
}
${meta?.title ? `\nRole title: ${meta.title}` : ""}${meta?.company ? `\nCompany: ${meta.company}` : ""}

Job description:
${trimmed.slice(0, 14_000)}`,
        },
      ],
      responseFormat: "json_object",
      temperature: 0.2,
    });

    const parsed = JSON.parse(raw) as unknown;
    const icp = parseIcp(parsed);

    if (
      icp.mustHaveSkills.length === 0 &&
      icp.keywordsForAts.required.length === 0
    ) {
      const tokens =
        trimmed
          .toLowerCase()
          .match(/\b[a-z][a-z0-9+#.]{2,}\b/g)
          ?.filter(
            (t) =>
              ![
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
              ].includes(t),
          ) ?? [];
      const unique = [...new Set(tokens)].slice(0, 10);
      const capitalized = unique.map(
        (w) => w.charAt(0).toUpperCase() + w.slice(1),
      );
      return {
        ...icp,
        mustHaveSkills: capitalized.slice(0, 6),
        keywordsForAts: {
          required: capitalized.slice(0, 6),
          preferred: capitalized.slice(6, 10),
        },
      };
    }

    return icp;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ICP extraction failed";
    throw new IcpExtractionError(message);
  }
}
