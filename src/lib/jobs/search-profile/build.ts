import type { JobCategory, RoleFamily, SeniorityLevel } from "@/generated/prisma";

import { classifyJobTitle } from "@/lib/jobs/taxonomy/classify-title";
import { jobCategoryFromRoleFamily } from "@/lib/jobs/taxonomy/role-family";
import type { ExperienceLevel } from "@/lib/validators/jobs";
import type { SearchProfile } from "@/lib/validators/search-profile";

export type BuildSearchProfileInput = {
  skills: string[];
  aspiringRole?: string | null;
  headline?: string | null;
  targetSeniority?: SeniorityLevel | null;
};

function uniqueRoles(roles: (string | null | undefined)[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const role of roles) {
    const trimmed = role?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function roleFamiliesFromRoles(roles: string[], max = 5): RoleFamily[] {
  const families = new Set<RoleFamily>();
  for (const role of roles) {
    const { roleFamily } = classifyJobTitle(role);
    if (roleFamily !== "UNKNOWN") families.add(roleFamily);
    if (families.size >= max) break;
  }
  return [...families].slice(0, max);
}

export function mapSeniorityToExperienceLevel(
  level: SeniorityLevel | null | undefined,
): ExperienceLevel | null {
  switch (level) {
    case "INTERN":
      return "INTERN";
    case "JUNIOR":
      return "JUNIOR";
    case "MID":
      return "MID";
    case "SENIOR":
      return "SENIOR";
    case "LEAD":
    case "EXECUTIVE":
      return "LEAD";
    default:
      return null;
  }
}

/** Rules-first Derived Search Profile builder. */
export function buildSearchProfile(input: BuildSearchProfileInput): SearchProfile {
  const primaryRoles = uniqueRoles(
    [input.aspiringRole, input.headline],
    4,
  );
  const derivedRoles = input.skills.slice(0, 4).map((s) => `${s} developer`);
  const targetRoleFamilies = roleFamiliesFromRoles([
    ...primaryRoles,
    ...derivedRoles,
  ]);
  const targetCategories = targetRoleFamilies.map((f) =>
    jobCategoryFromRoleFamily(f),
  ) as JobCategory[];

  return {
    primaryRoles,
    derivedRoles: derivedRoles.slice(0, 4),
    bridgeRoles: [],
    backgroundDomains: [],
    targetRoleFamilies,
    targetCategories: [...new Set(targetCategories)].filter(
      (c) => c !== "UNKNOWN",
    ),
    isCareerChange: false,
    source: "rules",
  };
}
