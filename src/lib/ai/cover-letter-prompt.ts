import type { ApplicationProfileSnapshotDto } from "../applications/snapshots";
import type { JobListingSnapshot } from "../applications/snapshots";

export type CoverLetterCitation = {
  field: string;
  excerpt: string;
};

export type CoverLetterGenerationResult = {
  content: string;
  citations: CoverLetterCitation[];
};

/** Placeholders models sometimes emit instead of the real name. */
const CANDIDATE_NAME_PLACEHOLDER_PATTERNS = [
  /\[\s*your\s*name\s*\]/gi,
  /\[\s*candidate\s*name\s*\]/gi,
  /\[\s*full\s*name\s*\]/gi,
  /\[\s*name\s*\]/gi,
  /<\s*your\s*name\s*>/gi,
] as const;

export function applyCandidateNameToCoverLetter(
  content: string,
  displayName: string,
): string {
  const name = displayName.trim();
  if (!name) return content;

  let result = content;
  for (const pattern of CANDIDATE_NAME_PLACEHOLDER_PATTERNS) {
    result = result.replace(pattern, name);
  }
  return result;
}

export function buildCoverLetterSystemPrompt(candidateDisplayName: string): string {
  const name = candidateDisplayName.trim();
  return `You are a professional cover letter writer for job seekers in the UK and Germany.
Rules:
- Use ONLY facts present in the candidate profile. Never invent employers, job titles, dates, skills, or education.
- The candidate's full name is "${name}". Sign the letter with this exact name (e.g. "Kind regards,\\n${name}"). Never use placeholders such as [Your Name], [Name], or "Your Name".
- Write in clear, professional English unless the job description is clearly German.
- Keep the letter concise (roughly 250–400 words), specific to the role, and ready to send after light editing.
- citations must reference real profile excerpts you used (field name + short quote).
- Return valid JSON only.`;
}

function formatExperience(experienceJson: unknown): string {
  if (!Array.isArray(experienceJson) || experienceJson.length === 0) return "";
  return experienceJson
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title : "";
      const company = typeof row.company === "string" ? row.company : "";
      const dates = typeof row.dates === "string" ? row.dates : "";
      const description =
        typeof row.description === "string" ? row.description : "";
      return [`${index + 1}. ${title} at ${company} (${dates})`, description]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatEducation(educationJson: unknown): string {
  if (!Array.isArray(educationJson) || educationJson.length === 0) return "";
  return educationJson
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      const parts = [
        typeof row.degree === "string" ? row.degree : null,
        typeof row.institution === "string" ? row.institution : null,
        typeof row.dates === "string" ? row.dates : null,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter(Boolean)
    .join("\n");
}

export type CoverLetterAtsContext = {
  missingKeywords: string[];
  requiredKeywords: string[];
  summaryRequirements: string;
  topGaps?: string[];
  cvEmphasis?: string[];
  coverLetterThemes?: string[];
  mustHaveSkillsMissing?: string[];
};

export function buildCoverLetterUserPrompt(input: {
  jobListing: JobListingSnapshot;
  jobDescriptionText: string;
  profile: ApplicationProfileSnapshotDto;
  candidateDisplayName: string;
  existingLetter?: string | null;
  adaptExisting?: boolean;
  atsContext?: CoverLetterAtsContext;
}): string {
  const {
    jobListing,
    jobDescriptionText,
    profile,
    candidateDisplayName,
    existingLetter,
    adaptExisting,
    atsContext,
  } = input;

  const name = candidateDisplayName.trim();

  const profileBlock = [
    `Candidate full name (required for signature): ${name}`,
    profile.summary?.trim() ? `Summary:\n${profile.summary.trim()}` : null,
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(", ")}` : null,
    formatExperience(profile.experienceJson)
      ? `Experience:\n${formatExperience(profile.experienceJson)}`
      : null,
    formatEducation(profile.educationJson)
      ? `Education:\n${formatEducation(profile.educationJson)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const adaptBlock =
    adaptExisting && existingLetter?.trim()
      ? `\n\nExisting cover letter (adapt and improve — keep accurate facts, improve clarity and fit):\n${existingLetter.trim()}`
      : "";

  const hasAtsContext =
    atsContext &&
    (atsContext.missingKeywords.length > 0 ||
      atsContext.requiredKeywords.length > 0 ||
      (atsContext.topGaps?.length ?? 0) > 0 ||
      (atsContext.mustHaveSkillsMissing?.length ?? 0) > 0);

  const atsBlock = hasAtsContext
    ? `\n\nICP fit targeting (weave naturally where truthful — never invent experience):
Required terms to reflect: ${atsContext!.requiredKeywords.slice(0, 10).join(", ") || "n/a"}
Priority ICP gaps to close (only if profile has evidence): ${(atsContext!.topGaps ?? atsContext!.missingKeywords).slice(0, 5).join(", ") || "n/a"}
Must-have skills missing from profile: ${(atsContext!.mustHaveSkillsMissing ?? []).slice(0, 5).join(", ") || "n/a"}
CV emphasis the lister expects: ${(atsContext!.cvEmphasis ?? []).slice(0, 4).join("; ") || "n/a"}
Cover letter themes to hit: ${(atsContext!.coverLetterThemes ?? []).slice(0, 4).join("; ") || "n/a"}
Role requirement summary: ${atsContext!.summaryRequirements || "n/a"}`
    : "";

  return `Write a professional cover letter for this job application.

Job title: ${jobListing.title}
Company: ${jobListing.company}
${jobListing.location ? `Location: ${jobListing.location}` : ""}

Job description:
${jobDescriptionText}

Candidate profile (ONLY use facts from this block — do not invent employers, dates, degrees, or skills):
${profileBlock}${adaptBlock}${atsBlock}

Return JSON: { "content": "<full letter text>", "citations": [{ "field": "<summary|skills|experience|education>", "excerpt": "<short quote from profile used>" }] }`;
}

/** @deprecated Use buildCoverLetterSystemPrompt(displayName) — kept for tests referencing a default. */
export const COVER_LETTER_SYSTEM_PROMPT = buildCoverLetterSystemPrompt("Candidate");

export function parseCoverLetterGeneration(
  raw: string,
  candidateDisplayName?: string,
): CoverLetterGenerationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response shape invalid");
  }

  const row = parsed as Record<string, unknown>;
  let content = typeof row.content === "string" ? row.content.trim() : "";
  if (!content) {
    throw new Error("AI response missing letter content");
  }

  if (candidateDisplayName?.trim()) {
    content = applyCandidateNameToCoverLetter(content, candidateDisplayName);
  }

  const citationsRaw = Array.isArray(row.citations) ? row.citations : [];
  const citations: CoverLetterCitation[] = citationsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const citation = item as Record<string, unknown>;
      const field = typeof citation.field === "string" ? citation.field.trim() : "";
      const excerpt = typeof citation.excerpt === "string" ? citation.excerpt.trim() : "";
      if (!field || !excerpt) return null;
      return { field, excerpt };
    })
    .filter((item): item is CoverLetterCitation => item !== null);

  return { content, citations };
}
