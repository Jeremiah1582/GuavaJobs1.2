import { textContainsKeyword } from "@/lib/ats/keyword-match";

import type {
  CareerTrajectory,
  CareerTrajectoryLabel,
  ExperienceEntry,
  JobMatchInput,
  MatchDimension,
  ProfilePreferencesInput,
  RoleFitsUserBreakdown,
} from "./types";

const SENIORITY_TITLE_HINTS: Record<string, string[]> = {
  INTERN: ["intern", "internship", "trainee", "placement"],
  JUNIOR: ["junior", "graduate", "entry", "associate"],
  MID: ["mid", "intermediate", "ii", "2"],
  SENIOR: ["senior", "sr", "lead", "principal"],
  LEAD: ["lead", "head", "manager", "director"],
  EXECUTIVE: ["chief", "vp", "executive", "director", "cto", "ceo"],
};

const EMPLOYMENT_KEYWORDS: Record<string, string[]> = {
  FULL_TIME: ["full-time", "full time", "permanent"],
  PART_TIME: ["part-time", "part time"],
  CONTRACT: ["contract", "contractor", "freelance"],
  INTERNSHIP: ["intern", "internship", "placement"],
  FREELANCE: ["freelance", "contract"],
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  challenge: ["challenge", "challenging", "complex", "ambitious", "impact"],
  team: ["team", "collaborative", "cross-functional", "large team", "squad"],
  growth: ["growth", "learning", "development", "career", "mentorship"],
  culture: ["culture", "values", "inclusive", "diverse"],
  salary: ["salary", "compensation", "pay", "bonus", "benefits"],
  balance: ["work-life", "flexible hours", "wellbeing", "balance"],
};

function normalizeLocationType(type: string): string {
  return type.trim().toLowerCase();
}

function scoreWorkMode(
  pref: ProfilePreferencesInput["workMode"],
  locationType: string,
): MatchDimension | null {
  if (!pref) return null;
  const jobType = normalizeLocationType(locationType);
  const jobRemote = jobType.includes("remote");
  const jobHybrid = jobType.includes("hybrid");
  const jobOnsite = jobType.includes("on-site") || jobType.includes("onsite");

  if (pref === "flexible") {
    return {
      key: "workMode",
      label: "Work mode",
      score: 80,
      matched: true,
      detail: "You are flexible on work mode.",
    };
  }

  const prefRemote = pref === "remote";
  const prefHybrid = pref === "hybrid";
  const prefOnsite = pref === "onsite";

  const matched =
    (prefRemote && jobRemote) ||
    (prefHybrid && (jobHybrid || jobRemote)) ||
    (prefOnsite && (jobOnsite || jobHybrid));

  return {
    key: "workMode",
    label: "Work mode",
    score: matched ? 100 : 30,
    matched,
    detail: matched
      ? `Role is ${locationType || "compatible"} with your ${pref} preference.`
      : `Role is ${locationType || "unspecified"}; you prefer ${pref}.`,
  };
}

function inferSeniorityFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [level, hints] of Object.entries(SENIORITY_TITLE_HINTS)) {
    if (hints.some((h) => lower.includes(h))) return level;
  }
  return null;
}

const SENIORITY_ORDER = ["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

function scoreSeniority(
  target: string | null | undefined,
  jobTitle: string,
): MatchDimension | null {
  if (!target) return null;
  const jobLevel = inferSeniorityFromTitle(jobTitle);
  if (!jobLevel) {
    return {
      key: "seniority",
      label: "Seniority",
      score: 70,
      matched: true,
      detail: "Could not infer seniority from title; neutral score.",
    };
  }
  const targetIdx = SENIORITY_ORDER.indexOf(target);
  const jobIdx = SENIORITY_ORDER.indexOf(jobLevel);
  if (targetIdx < 0 || jobIdx < 0) return null;

  const diff = Math.abs(targetIdx - jobIdx);
  const score = diff === 0 ? 100 : diff === 1 ? 75 : 35;
  return {
    key: "seniority",
    label: "Seniority",
    score,
    matched: diff <= 1,
    detail:
      diff === 0
        ? `Title aligns with your ${target.toLowerCase()} target.`
        : diff === 1
          ? `Title (${jobLevel.toLowerCase()}) is close to your ${target.toLowerCase()} target.`
          : `Title suggests ${jobLevel.toLowerCase()}; you target ${target.toLowerCase()}.`,
  };
}

function scoreEmploymentType(
  pref: string | null | undefined,
  job: JobMatchInput,
): MatchDimension | null {
  if (!pref || pref === "UNKNOWN") return null;
  const haystack = `${job.title} ${job.description}`.toLowerCase();
  const keywords = EMPLOYMENT_KEYWORDS[pref] ?? [];
  const matched = keywords.some((k) => haystack.includes(k));
  return {
    key: "employmentType",
    label: "Employment type",
    score: matched ? 100 : 55,
    matched,
    detail: matched
      ? `Listing mentions ${pref.toLowerCase().replace("_", " ")} work.`
      : `No clear ${pref.toLowerCase().replace("_", " ")} signal in the listing.`,
  };
}

function scoreLocation(
  profile: ProfilePreferencesInput,
  jobLocation: string,
): MatchDimension | null {
  const parts = [profile.city, profile.region, profile.country].filter(Boolean) as string[];
  if (parts.length === 0) return null;

  const jobLower = jobLocation.toLowerCase();
  const matchedPart = parts.find((p) => jobLower.includes(p.toLowerCase()));
  if (matchedPart) {
    return {
      key: "location",
      label: "Location",
      score: 100,
      matched: true,
      detail: `Role is in ${jobLocation}, matching your ${matchedPart} preference.`,
    };
  }

  const willing =
    profile.relocationWillingness === "NATIONAL" ||
    profile.relocationWillingness === "INTERNATIONAL";

  return {
    key: "location",
    label: "Location",
    score: willing ? 65 : 35,
    matched: willing,
    detail: willing
      ? `Role is in ${jobLocation || "another area"}; you are open to relocating.`
      : `Role is in ${jobLocation || "another area"}; outside your preferred location.`,
  };
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
  const tokensB = b
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (tokensB.length === 0) return 0;
  const hits = tokensB.filter((t) => tokensA.has(t)).length;
  return Math.round((hits / tokensB.length) * 100);
}

function scoreAspiringRole(
  aspiringRole: string | null | undefined,
  jobTitle: string,
): MatchDimension | null {
  if (!aspiringRole?.trim()) return null;
  const overlap = tokenOverlap(aspiringRole, jobTitle);
  return {
    key: "aspiringRole",
    label: "Role direction",
    score: Math.max(overlap, 40),
    matched: overlap >= 50,
    detail:
      overlap >= 50
        ? `Title aligns with your goal: ${aspiringRole}.`
        : `Title differs from your aspiring role (${aspiringRole}).`,
  };
}

function parseSalaryFromText(text: string): number | null {
  const patterns = [
    /[£€$]\s*([\d,]+(?:\.\d+)?)\s*k/i,
    /[£€$]\s*([\d,]+(?:\.\d+)?)/i,
    /([\d,]+)\s*k\s*(?:per\s*year|pa|annually)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (!m?.[1]) continue;
    let value = Number.parseFloat(m[1].replace(/,/g, ""));
    if (Number.isNaN(value)) continue;
    if (/k/i.test(m[0])) value *= 1000;
    return value;
  }
  return null;
}

function scoreSalary(
  salaryMin: number | null | undefined,
  description: string,
  currency?: string | null,
): MatchDimension | null {
  if (salaryMin == null) return null;
  const parsed = parseSalaryFromText(description);
  if (parsed == null) {
    return {
      key: "salary",
      label: "Salary",
      score: 70,
      matched: true,
      detail: `Salary not listed; your minimum is ${currency ?? ""}${salaryMin.toLocaleString()}.`,
    };
  }
  const matched = parsed >= salaryMin;
  return {
    key: "salary",
    label: "Salary",
    score: matched ? 100 : 25,
    matched,
    detail: matched
      ? `Listed pay (~${parsed.toLocaleString()}) meets your ${salaryMin.toLocaleString()} minimum.`
      : `Listed pay (~${parsed.toLocaleString()}) is below your ${salaryMin.toLocaleString()} minimum.`,
  };
}

function scorePriorities(
  priorities: string[] | undefined,
  description: string,
): MatchDimension | null {
  if (!priorities?.length) return null;
  const haystack = description.toLowerCase();
  let hits = 0;
  const matchedLabels: string[] = [];

  for (const priority of priorities) {
    const key = priority.toLowerCase().trim();
    const keywords = PRIORITY_KEYWORDS[key] ?? [key];
    if (keywords.some((k) => haystack.includes(k) || textContainsKeyword(description, k))) {
      hits++;
      matchedLabels.push(priority);
    }
  }

  const ratio = hits / priorities.length;
  return {
    key: "priorities",
    label: "What matters to you",
    score: Math.round(50 + ratio * 50),
    matched: ratio >= 0.5,
    detail:
      matchedLabels.length > 0
        ? `Listing reflects: ${matchedLabels.join(", ")}.`
        : "Few of your stated priorities appear in the description.",
  };
}

function personalityModifier(
  personalityType: string | null | undefined,
  description: string,
): number {
  if (!personalityType?.trim()) return 0;
  const type = personalityType.toUpperCase();
  const extrovert = type.startsWith("E");
  const introvert = type.startsWith("I");
  const haystack = description.toLowerCase();

  let delta = 0;
  if (extrovert && (haystack.includes("team") || haystack.includes("collaborat"))) delta += 5;
  if (introvert && (haystack.includes("independent") || haystack.includes("autonom"))) delta += 5;
  if (type.includes("N") && (haystack.includes("innov") || haystack.includes("creative"))) delta += 5;
  if (type.includes("T") && (haystack.includes("analyt") || haystack.includes("data"))) delta += 5;

  return Math.min(delta, 10);
}

// ─── Career trajectory ────────────────────────────────────────────────────────

function extractExperienceDomainTokens(entries: ExperienceEntry[], limit = 3): Set<string> {
  const tokens = new Set<string>();
  for (const entry of entries.slice(0, limit)) {
    for (const word of entry.role.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length > 2) tokens.add(word);
    }
    for (const bullet of entry.bullets ?? []) {
      for (const word of bullet.toLowerCase().split(/[^a-z0-9]+/)) {
        if (word.length > 3) tokens.add(word);
      }
    }
  }
  return tokens;
}

function inferSeniorityLevelFromTitle(title: string): number {
  const t = title.toLowerCase();
  if (SENIORITY_TITLE_HINTS.INTERN?.some((h) => t.includes(h))) return 0;
  if (SENIORITY_TITLE_HINTS.JUNIOR?.some((h) => t.includes(h))) return 1;
  if (SENIORITY_TITLE_HINTS.MID?.some((h) => t.includes(h))) return 2;
  if (SENIORITY_TITLE_HINTS.SENIOR?.some((h) => t.includes(h))) return 3;
  if (SENIORITY_TITLE_HINTS.LEAD?.some((h) => t.includes(h))) return 4;
  if (SENIORITY_TITLE_HINTS.EXECUTIVE?.some((h) => t.includes(h))) return 5;
  return -1;
}

const SENIORITY_INDEX: Record<string, number> = {
  INTERN: 0, JUNIOR: 1, MID: 2, SENIOR: 3, LEAD: 4, EXECUTIVE: 5,
};

function trajectoryLabel(score: number): CareerTrajectoryLabel {
  if (score >= 80) return "Step forward";
  if (score >= 60) return "Lateral move";
  if (score >= 40) return "Tangential";
  return "Different direction";
}

function trajectoryDetail(label: CareerTrajectoryLabel, aspiringRole?: string | null): string {
  switch (label) {
    case "Step forward":
      return aspiringRole
        ? `Directly on the path to your goal: ${aspiringRole}.`
        : "Aligns well with your career direction.";
    case "Lateral move":
      return "Adjacent to your current lane — broadens experience without diverging.";
    case "Tangential":
      return "Overlaps some of your background but takes you in a different direction.";
    case "Different direction":
      return aspiringRole
        ? `This role diverges from your goal: ${aspiringRole}.`
        : "This role diverges from your current career direction.";
  }
}

export function computeCareerTrajectory(
  profile: ProfilePreferencesInput,
  job: JobMatchInput,
): CareerTrajectory | null {
  const hasAspiration = Boolean(profile.aspiringRole?.trim());
  const hasExperience = Boolean(profile.experienceJson?.length);

  if (!hasAspiration && !hasExperience) return null;

  // 1. Aspiration alignment (0–100)
  let aspirationAlignment = 50;
  if (hasAspiration) {
    const overlap = tokenOverlap(profile.aspiringRole!, job.title);
    aspirationAlignment = Math.max(overlap, 30);
  }

  // 2. Domain continuity (0–100)
  let domainContinuity = 50;
  if (hasExperience) {
    const domainTokens = extractExperienceDomainTokens(profile.experienceJson!);
    const jobHaystack = `${job.title} ${job.description}`.toLowerCase();
    const jobWords = new Set(jobHaystack.split(/[^a-z0-9]+/).filter((w) => w.length > 3));
    const intersection = [...domainTokens].filter((t) => jobWords.has(t));
    const ratio = domainTokens.size > 0 ? intersection.length / domainTokens.size : 0;
    domainContinuity = Math.round(Math.min(ratio * 200, 100));
  }

  // 3. Seniority progression (0–100)
  let seniorityProgression = 70;
  const mostRecentRole = profile.experienceJson?.[0]?.role ?? "";
  const currentLevel = inferSeniorityLevelFromTitle(mostRecentRole);
  const targetLevel = profile.targetSeniority ? (SENIORITY_INDEX[profile.targetSeniority] ?? -1) : -1;
  const jobLevel = inferSeniorityLevelFromTitle(job.title);

  if (currentLevel >= 0 && jobLevel >= 0) {
    const diff = jobLevel - currentLevel;
    if (diff === 1) seniorityProgression = 100;
    else if (diff === 0) seniorityProgression = 85;
    else if (diff === 2) seniorityProgression = 65;
    else if (diff > 2) seniorityProgression = 40;
    else seniorityProgression = 30;
  } else if (targetLevel >= 0 && jobLevel >= 0) {
    const diff = Math.abs(jobLevel - targetLevel);
    seniorityProgression = diff === 0 ? 100 : diff === 1 ? 75 : 40;
  }

  const weights = hasAspiration && hasExperience
    ? { asp: 0.5, dom: 0.3, sen: 0.2 }
    : hasAspiration
      ? { asp: 0.7, dom: 0, sen: 0.3 }
      : { asp: 0, dom: 0.7, sen: 0.3 };

  const score = Math.round(
    weights.asp * aspirationAlignment +
    weights.dom * domainContinuity +
    weights.sen * seniorityProgression,
  );

  const label = trajectoryLabel(score);

  return {
    score,
    label,
    detail: trajectoryDetail(label, profile.aspiringRole),
    aspirationAlignment,
    domainContinuity,
    seniorityProgression,
  };
}

function hasPreferenceSignals(profile: ProfilePreferencesInput): boolean {
  return Boolean(
    profile.workMode ||
      profile.targetSeniority ||
      profile.employmentTypePreference ||
      profile.aspiringRole?.trim() ||
      profile.salaryMin != null ||
      profile.city?.trim() ||
      profile.region?.trim() ||
      profile.country?.trim() ||
      (profile.priorities && profile.priorities.length > 0) ||
      profile.personalityType?.trim() ||
      (profile.experienceJson && profile.experienceJson.length > 0),
  );
}

export function computeRoleFitsUser(
  profile: ProfilePreferencesInput,
  job: JobMatchInput,
): RoleFitsUserBreakdown {
  if (!hasPreferenceSignals(profile)) {
    return {
      score: null,
      reason: "Add career preferences for role-fit scoring.",
      dimensions: [],
    };
  }

  const trajectory = computeCareerTrajectory(profile, job);
  const trajectoryDimension: MatchDimension | null = trajectory
    ? {
        key: "careerTrajectory",
        label: trajectory.label,
        score: trajectory.score,
        matched: trajectory.score >= 60,
        detail: trajectory.detail,
      }
    : null;

  const dimensions: MatchDimension[] = [
    scoreWorkMode(profile.workMode, job.locationType),
    scoreSeniority(profile.targetSeniority, job.title),
    scoreEmploymentType(profile.employmentTypePreference, job),
    scoreLocation(profile, job.location),
    scoreAspiringRole(profile.aspiringRole, job.title),
    scoreSalary(profile.salaryMin, job.description, profile.salaryCurrency),
    scorePriorities(profile.priorities, job.description),
    trajectoryDimension,
  ].filter((d): d is MatchDimension => d !== null);

  if (dimensions.length === 0) {
    return {
      score: null,
      reason: "Add career preferences for role-fit scoring.",
      dimensions: [],
    };
  }

  const baseScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );
  const modifier = personalityModifier(profile.personalityType, job.description);
  const score = Math.min(100, Math.max(0, baseScore + modifier));

  const matchedCount = dimensions.filter((d) => d.matched).length;
  const reason =
    matchedCount >= dimensions.length / 2
      ? `${matchedCount} of ${dimensions.length} preference checks align with this role.`
      : `Only ${matchedCount} of ${dimensions.length} preference checks fully align.`;

  return { score, reason, dimensions };
}
