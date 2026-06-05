import { normalizeKeyword, textContainsKeyword } from "@/lib/ats/keyword-match";
import type { ApplicationProfileSnapshotDto } from "../snapshots";
import type {
  DimensionMatch,
  IdealCandidateProfile,
  IcpMatchReport,
  MatchStatus,
} from "./types";

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
  const normalized = normalizeKeyword(skill);
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

function profileHaystack(
  profile: ApplicationProfileSnapshotDto,
  cvText?: string,
): string {
  const parts: string[] = [];
  if (profile.summary?.trim()) parts.push(profile.summary);
  if (profile.skills.length > 0) parts.push(profile.skills.join(" "));
  if (Array.isArray(profile.experienceJson)) {
    for (const entry of profile.experienceJson) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      for (const key of ["title", "company", "description", "dates"]) {
        if (typeof row[key] === "string") parts.push(row[key] as string);
      }
    }
  }
  if (Array.isArray(profile.educationJson)) {
    for (const entry of profile.educationJson) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      for (const key of ["degree", "institution", "field", "dates"]) {
        if (typeof row[key] === "string") parts.push(row[key] as string);
      }
    }
  }
  if (cvText?.trim()) parts.push(cvText);
  return parts.join("\n").toLowerCase();
}

function skillFound(haystack: string, skill: string): boolean {
  if (textContainsKeyword(haystack, skill)) return true;
  return expandSkillTerms(skill).some((term) =>
    textContainsKeyword(haystack, term),
  );
}

function statusFromRatio(ratio: number): MatchStatus {
  if (ratio >= 0.8) return "met";
  if (ratio >= 0.4) return "partial";
  return "missing";
}

function matchSkills(
  icp: IdealCandidateProfile,
  haystack: string,
): DimensionMatch {
  const mustHave = icp.mustHaveSkills.filter(Boolean);
  const niceToHave = icp.niceToHaveSkills.filter(Boolean);
  const met: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  for (const skill of mustHave) {
    if (skillFound(haystack, skill)) {
      met.push(skill);
    } else {
      missing.push(skill);
    }
  }

  for (const skill of niceToHave) {
    if (skillFound(haystack, skill)) {
      if (!met.includes(skill)) met.push(skill);
    } else if (!missing.includes(skill)) {
      partial.push(skill);
    }
  }

  const mustRatio =
    mustHave.length === 0 ? 1 : met.filter((s) => mustHave.includes(s)).length / mustHave.length;
  const score = Math.round(mustRatio * 100);

  return {
    status: statusFromRatio(mustRatio),
    score,
    met,
    partial,
    missing,
    gap:
      missing.length > 0
        ? `Missing must-have skills: ${missing.slice(0, 3).join(", ")}`
        : undefined,
  };
}

function matchExperience(
  icp: IdealCandidateProfile,
  haystack: string,
  profile: ApplicationProfileSnapshotDto,
): DimensionMatch {
  const domains = icp.experience.domains.filter(Boolean);
  const phrases = icp.experience.evidencePhrases.filter(Boolean);
  const met: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  for (const domain of domains) {
    if (skillFound(haystack, domain)) met.push(domain);
    else missing.push(domain);
  }

  for (const phrase of phrases) {
    if (textContainsKeyword(haystack, phrase)) {
      if (!met.includes(phrase)) met.push(phrase);
    } else if (!missing.includes(phrase)) {
      partial.push(phrase);
    }
  }

  let yearsScore = 1;
  if (icp.experience.minYears != null && icp.experience.minYears > 0) {
    const expCount = Array.isArray(profile.experienceJson)
      ? profile.experienceJson.length
      : 0;
    yearsScore = expCount >= icp.experience.minYears ? 1 : expCount > 0 ? 0.5 : 0;
    if (yearsScore < 1 && icp.experience.minYears) {
      missing.push(`${icp.experience.minYears}+ years experience`);
    }
  }

  const domainRatio =
    domains.length === 0 ? 1 : met.filter((d) => domains.includes(d)).length / domains.length;
  const combined = domains.length === 0 ? yearsScore : (domainRatio + yearsScore) / 2;
  const score = Math.round(combined * 100);

  return {
    status: statusFromRatio(combined),
    score,
    met,
    partial,
    missing,
    gap:
      missing.length > 0
        ? `Limited evidence of: ${missing.slice(0, 2).join(", ")}`
        : undefined,
  };
}

function matchEducation(
  icp: IdealCandidateProfile,
  haystack: string,
): DimensionMatch {
  const levels = icp.education.levels.filter(Boolean);
  const fields = icp.education.fields.filter(Boolean);
  const met: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  if (!icp.education.required && levels.length === 0 && fields.length === 0) {
    return {
      status: "met",
      score: 100,
      met: ["No specific degree required"],
      partial: [],
      missing: [],
    };
  }

  for (const level of levels) {
    if (textContainsKeyword(haystack, level)) met.push(level);
    else missing.push(level);
  }

  for (const field of fields) {
    if (textContainsKeyword(haystack, field)) {
      if (!met.includes(field)) met.push(field);
    } else if (!missing.includes(field)) {
      partial.push(field);
    }
  }

  const requiredItems = [...levels, ...fields];
  const hitCount = met.length;
  const ratio =
    requiredItems.length === 0
      ? haystack.includes("degree") || haystack.includes("bachelor") || haystack.includes("master")
        ? 1
        : icp.education.required
          ? 0
          : 0.7
      : hitCount / requiredItems.length;

  const hasEquivalent =
    haystack.includes("equivalent") ||
    haystack.includes("self-taught") ||
    (haystack.includes("bachelor") && missing.some((m) => m.toLowerCase().includes("master")));

  const adjustedRatio = hasEquivalent && ratio < 0.8 ? Math.max(ratio, 0.6) : ratio;
  const score = Math.round(adjustedRatio * 100);

  return {
    status: statusFromRatio(adjustedRatio),
    score,
    met,
    partial,
    missing,
    gap:
      icp.education.required && missing.length > 0
        ? `Education gap: ${missing.slice(0, 2).join(", ")}`
        : undefined,
  };
}

const SENIORITY_RANK: Record<string, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
};

function inferProfileSeniority(
  profile: ApplicationProfileSnapshotDto,
  haystack: string,
): number | null {
  if (haystack.includes("lead") || haystack.includes("principal")) return 4;
  if (haystack.includes("senior") || haystack.includes("sr.")) return 3;
  if (haystack.includes("mid-level") || haystack.includes("intermediate")) return 2;
  if (haystack.includes("junior") || haystack.includes("graduate")) return 1;
  if (haystack.includes("intern")) return 0;

  const expCount = Array.isArray(profile.experienceJson)
    ? profile.experienceJson.length
    : 0;
  if (expCount === 0) return null;
  if (expCount >= 5) return 3;
  if (expCount >= 3) return 2;
  if (expCount >= 1) return 1;
  return 0;
}

function matchSeniority(
  icp: IdealCandidateProfile,
  profile: ApplicationProfileSnapshotDto,
  haystack: string,
): DimensionMatch {
  if (!icp.seniority) {
    return {
      status: "met",
      score: 100,
      met: ["Seniority not specified"],
      partial: [],
      missing: [],
    };
  }

  const target = SENIORITY_RANK[icp.seniority] ?? 2;
  const actual = inferProfileSeniority(profile, haystack);
  const met: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  if (actual === null) {
    return {
      status: "partial",
      score: 50,
      met: [],
      partial: ["Could not infer seniority from profile"],
      missing: [`Role targets ${icp.seniority} level`],
      gap: `Align examples to ${icp.seniority} level`,
    };
  }

  const diff = Math.abs(actual - target);
  if (diff === 0) {
    met.push(`Profile aligns with ${icp.seniority} level`);
  } else if (diff === 1) {
    partial.push(`Adjacent to ${icp.seniority} (${actual < target ? "below" : "above"})`);
  } else {
    missing.push(`Mismatch: role is ${icp.seniority}, profile reads ${actual < target ? "more junior" : "more senior"}`);
  }

  const ratio = diff === 0 ? 1 : diff === 1 ? 0.55 : 0.2;
  const score = Math.round(ratio * 100);

  return {
    status: statusFromRatio(ratio),
    score,
    met,
    partial,
    missing,
    gap: missing[0],
  };
}

function matchQualifications(
  icp: IdealCandidateProfile,
  haystack: string,
): DimensionMatch {
  const quals = icp.qualifications.filter(Boolean);
  if (quals.length === 0) {
    return {
      status: "met",
      score: 100,
      met: ["No special qualifications listed"],
      partial: [],
      missing: [],
    };
  }

  const met: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  for (const qual of quals) {
    if (textContainsKeyword(haystack, qual)) met.push(qual);
    else if (
      qual.toLowerCase().includes("right to work") &&
      (haystack.includes("citizen") || haystack.includes("visa") || haystack.includes("sponsorship"))
    ) {
      partial.push(qual);
    } else {
      missing.push(qual);
    }
  }

  const ratio = met.length / quals.length;
  const score = Math.round(ratio * 100);

  return {
    status: statusFromRatio(ratio),
    score,
    met,
    partial,
    missing,
    gap:
      missing.length > 0
        ? `Confirm: ${missing.slice(0, 2).join(", ")}`
        : undefined,
  };
}

function computeOverallStatus(
  overallScore: number,
  skills: DimensionMatch,
): MatchStatus {
  if (overallScore < 45 || skills.status === "missing") return "missing";
  if (overallScore >= 75) return "met";
  if (overallScore >= 45 || skills.status === "partial") return "partial";
  return "missing";
}

export function matchIcpToProfile(
  icp: IdealCandidateProfile,
  profile: ApplicationProfileSnapshotDto,
  cvText?: string,
): IcpMatchReport {
  const haystack = profileHaystack(profile, cvText);

  const skills = matchSkills(icp, haystack);
  const experience = matchExperience(icp, haystack, profile);
  const education = matchEducation(icp, haystack);
  const seniority = matchSeniority(icp, profile, haystack);
  const qualifications = matchQualifications(icp, haystack);

  const weights = { skills: 0.35, experience: 0.25, education: 0.15, seniority: 0.1, qualifications: 0.15 };
  const overallScore = Math.round(
    skills.score * weights.skills +
      experience.score * weights.experience +
      education.score * weights.education +
      seniority.score * weights.seniority +
      qualifications.score * weights.qualifications,
  );

  const overallStatus = computeOverallStatus(overallScore, skills);

  const topGaps = [
    ...skills.missing,
    ...experience.missing,
    ...education.missing,
    ...seniority.missing,
    ...qualifications.missing,
  ]
    .filter(Boolean)
    .slice(0, 5);

  const topStrengths = [
    ...skills.met,
    ...experience.met,
    ...education.met,
    ...seniority.met,
    ...qualifications.met,
  ]
    .filter(Boolean)
    .slice(0, 5);

  return {
    overallStatus,
    overallScore,
    dimensions: { skills, experience, education, seniority, qualifications },
    topGaps,
    topStrengths,
  };
}
