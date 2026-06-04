import type { EducationEntry, ExperienceEntry, ProfileQuiz } from "../../validators/profile";
import {
  profileImportAiSchema,
  type ProfileImportAiPayload,
  type ProfileImportAiQuiz,
  type ProfileUrlImportResult,
} from "../../validators/profile-import";
import { ProfileUrlImportError } from "./errors";

const PLACEHOLDER = "Unknown";

function nonEmpty(value: string | null | undefined, fallback = ""): string {
  const v = value?.trim();
  return v && v.length > 0 ? v : fallback;
}

function normalizeExperience(
  raw: ProfileImportAiPayload["experience"],
): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];

  for (const item of raw) {
    const role = nonEmpty(item.role ?? item.title, PLACEHOLDER);
    const company = nonEmpty(item.company, PLACEHOLDER);
    const bullets = (item.bullets?.length ? item.bullets : item.highlights ?? [])
      .map((b) => b.trim())
      .filter(Boolean)
      .slice(0, 30);

    entries.push({
      role: role.slice(0, 200),
      company: company.slice(0, 200),
      startDate: nonEmpty(item.startDate ?? undefined, "—").slice(0, 50),
      endDate: item.endDate ? item.endDate.slice(0, 50) : undefined,
      bullets: bullets.length ? bullets : [""],
    });
  }

  return entries.slice(0, 30);
}

function normalizeEducation(
  raw: ProfileImportAiPayload["education"],
): EducationEntry[] {
  return raw
    .filter((e) => nonEmpty(e.institution))
    .map((e) => ({
      institution: nonEmpty(e.institution).slice(0, 200),
      degree: e.degree ? e.degree.slice(0, 200) : undefined,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
    }))
    .slice(0, 20);
}

function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const skill of skills) {
    const s = skill.trim();
    if (!s || s.length > 100) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 100) break;
  }
  return out;
}

function normalizeQuiz(
  raw: ProfileImportAiQuiz | null | undefined,
): ProfileQuiz | undefined {
  if (!raw) return undefined;

  const roleType = raw.roleType?.trim();
  const workMode = raw.workMode ?? undefined;
  const priorities = raw.priorities
    ?.map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (!roleType && !workMode && !priorities?.length) {
    return undefined;
  }

  return {
    ...(roleType ? { roleType: roleType.slice(0, 100) } : {}),
    ...(workMode ? { workMode } : {}),
    ...(priorities?.length ? { priorities } : {}),
  };
}

function deriveConfidence(
  payload: ProfileImportAiPayload,
  experience: ExperienceEntry[],
  skills: string[],
): "high" | "medium" | "low" {
  if (payload.confidence) return payload.confidence;

  let score = 0;
  if (payload.summary?.trim()) score += 2;
  if (experience.length > 0) score += 2;
  if (skills.length >= 3) score += 1;
  if (payload.education.length > 0) score += 1;

  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function normalizeAiProfile(
  raw: unknown,
  pagesScanned: ProfileUrlImportResult["pagesScanned"],
): ProfileUrlImportResult {
  const parsedResult = profileImportAiSchema.safeParse(raw);
  if (!parsedResult.success) {
    throw new ProfileUrlImportError(
      `AI response validation failed: ${parsedResult.error.message}`,
      "AI_PARSE_FAILED",
      500,
      "We could not understand the page content. Try a different URL or paste your CV.",
    );
  }
  const parsed = parsedResult.data;

  const experience = normalizeExperience(parsed.experience);
  const education = normalizeEducation(parsed.education);
  const skills = normalizeSkills(parsed.skills);
  const quiz = normalizeQuiz(parsed.quiz);

  const address = parsed.address;
  const trimOrNull = (v: string | null | undefined) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  return {
    name: trimOrNull(parsed.name),
    headline: trimOrNull(parsed.headline),
    summary: trimOrNull(parsed.summary),
    location: trimOrNull(parsed.location),
    phone: trimOrNull(parsed.phone),
    avatarUrl: trimOrNull(parsed.avatarUrl),
    websiteUrl: trimOrNull(parsed.websiteUrl),
    addressLine1: trimOrNull(address?.addressLine1),
    addressLine2: trimOrNull(address?.addressLine2),
    city: trimOrNull(address?.city),
    region: trimOrNull(address?.region),
    postalCode: trimOrNull(address?.postalCode),
    country: trimOrNull(address?.country),
    skills,
    experience,
    education,
    quiz,
    confidence: deriveConfidence(parsed, experience, skills),
    pagesScanned,
  };
}
