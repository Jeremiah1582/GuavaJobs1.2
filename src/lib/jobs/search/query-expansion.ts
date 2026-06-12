import type { SearchProfile } from "@/lib/validators/search-profile";

export function ftsQueryFromText(q: string): string {
  return q
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

export function recommendedFtsQuery(dsp: SearchProfile): string {
  const roles = [...dsp.primaryRoles, ...dsp.derivedRoles].filter(Boolean);
  if (roles.length === 0) return "";
  return roles.slice(0, 3).join(" ");
}
