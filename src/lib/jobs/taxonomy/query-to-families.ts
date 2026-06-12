import type { JobCategory, RoleFamily } from "@/generated/prisma";

import type { SearchProfile } from "@/lib/validators/search-profile";

import { classifyJobTitle } from "./classify-title";

const QUERY_ALIASES: Array<{ pattern: RegExp; families: RoleFamily[] }> = [
  {
    pattern: /\bsolutions engineer\b|\bsales engineer\b|\bpre-?sales\b/i,
    families: ["OTHER", "SOFTWARE_ENGINEER"],
  },
  {
    pattern: /\btechnical account manager\b|\btam\b/i,
    families: ["OTHER"],
  },
  {
    pattern: /\bcustomer success\b|\bcsm\b/i,
    families: ["OTHER"],
  },
  {
    pattern: /\bfull[\s-]?stack\b/i,
    families: ["FULLSTACK", "FRONTEND", "BACKEND", "SOFTWARE_ENGINEER"],
  },
  { pattern: /\bfront[\s-]?end\b/i, families: ["FRONTEND", "SOFTWARE_ENGINEER"] },
  { pattern: /\bback[\s-]?end\b/i, families: ["BACKEND", "SOFTWARE_ENGINEER"] },
  {
    pattern: /\bsoftware\s+(engineer|developer)\b/i,
    families: ["SOFTWARE_ENGINEER", "FULLSTACK"],
  },
  { pattern: /\bdata\s+scien/i, families: ["DATA_SCIENCE", "ML_AI"] },
  { pattern: /\bdata\s+analy/i, families: ["DATA_ANALYTICS", "DATA_SCIENCE"] },
  { pattern: /\bml\b|\bmachine learning\b/i, families: ["ML_AI", "DATA_SCIENCE"] },
  { pattern: /\bdevops\b|\bsre\b/i, families: ["DEVOPS", "SOFTWARE_ENGINEER"] },
  { pattern: /\bmobile\b|\bios\b|\bandroid\b/i, families: ["MOBILE"] },
  { pattern: /\bproduct\s+manager\b/i, families: ["PRODUCT_MANAGER"] },
  { pattern: /\bux\b|\bui\b|\bdesigner\b/i, families: ["UX_DESIGN"] },
  { pattern: /\bqa\b|\bquality\b/i, families: ["QA"] },
];

const WIDEN: Partial<Record<RoleFamily, RoleFamily[]>> = {
  FULLSTACK: ["FRONTEND", "BACKEND", "SOFTWARE_ENGINEER"],
  FRONTEND: ["SOFTWARE_ENGINEER", "FULLSTACK"],
  BACKEND: ["SOFTWARE_ENGINEER", "FULLSTACK"],
  SOFTWARE_ENGINEER: ["FULLSTACK", "FRONTEND", "BACKEND"],
  DATA_SCIENCE: ["DATA_ANALYTICS", "ML_AI"],
  DATA_ANALYTICS: ["DATA_SCIENCE"],
  ML_AI: ["DATA_SCIENCE"],
  OTHER: ["SOFTWARE_ENGINEER"],
};

export function queryToRoleFamilies(query: string): RoleFamily[] {
  const families = new Set<RoleFamily>();
  const classified = classifyJobTitle(query);
  if (classified.roleFamily !== "UNKNOWN") {
    families.add(classified.roleFamily);
  }
  for (const { pattern, families: list } of QUERY_ALIASES) {
    if (pattern.test(query)) {
      for (const f of list) families.add(f);
    }
  }
  if (families.size === 0) {
    families.add("SOFTWARE_ENGINEER");
    families.add("FULLSTACK");
    families.add("UNKNOWN");
  }
  return [...families];
}

export function queryToJobCategories(query: string): JobCategory[] {
  const classified = classifyJobTitle(query);
  if (classified.jobCategory !== "UNKNOWN") {
    return [classified.jobCategory];
  }
  if (/\b(solutions|sales|customer success|account)\b/i.test(query)) {
    return ["SALES", "BUSINESS_DEVELOPMENT"];
  }
  return [];
}

export function widenRoleFamilies(families: RoleFamily[]): RoleFamily[] {
  const out = new Set(families);
  for (const f of families) {
    for (const extra of WIDEN[f] ?? []) out.add(extra);
  }
  out.add("UNKNOWN");
  return [...out];
}

export function dspToRoleFamilies(dsp: SearchProfile): RoleFamily[] {
  const families = new Set<RoleFamily>(dsp.targetRoleFamilies);
  for (const role of [...dsp.primaryRoles, ...dsp.derivedRoles, ...dsp.bridgeRoles]) {
    const { roleFamily } = classifyJobTitle(role);
    if (roleFamily !== "UNKNOWN") families.add(roleFamily);
  }
  if (families.size === 0) {
    families.add("SOFTWARE_ENGINEER");
    families.add("UNKNOWN");
  }
  return [...families];
}

export function dspToJobCategories(
  dsp: SearchProfile,
  targetJobCategories: JobCategory[],
): JobCategory[] {
  if (targetJobCategories.length > 0) return targetJobCategories;
  if (dsp.targetCategories.length > 0) return dsp.targetCategories;
  return [];
}
