import type { JobCategory, RoleFamily } from "@/generated/prisma";

import { jobCategoryFromRoleFamily } from "./role-family";

export type ClassifiedJobTaxonomy = {
  roleFamily: RoleFamily;
  jobCategory: JobCategory;
};

function matchRoleFamily(text: string): RoleFamily | null {
  if (
    /\b(solutions engineer|sales engineer|pre-?sales engineer|presales engineer)\b/i.test(
      text,
    )
  ) {
    return "OTHER";
  }
  if (/\b(technical account manager|\btam\b)\b/i.test(text)) return "OTHER";
  if (/\b(customer success|csm|client success)\b/i.test(text)) return "OTHER";
  if (/\b(account executive|business development|bdr|sdr)\b/i.test(text)) {
    return "OTHER";
  }
  if (/\bfull[\s-]?stack\b/i.test(text)) return "FULLSTACK";
  if (/\bfront[\s-]?end\b/i.test(text)) return "FRONTEND";
  if (/\bback[\s-]?end\b/i.test(text)) return "BACKEND";
  if (/\bmobile\b|\bios\b|\bandroid\b|\bflutter\b/i.test(text)) return "MOBILE";
  if (/\bdevops\b|\bsre\b|\bplatform engineer\b/i.test(text)) return "DEVOPS";
  if (/\bdata\s+scien/i.test(text) || /\bmachine learning engineer\b/i.test(text)) {
    return "DATA_SCIENCE";
  }
  if (/\bdata\s+analy|\bbusiness intelligence\b|\bbi analyst\b/i.test(text)) {
    return "DATA_ANALYTICS";
  }
  if (/\bml engineer\b|\bai engineer\b|\bdeep learning\b/i.test(text)) return "ML_AI";
  if (/\bproduct manager\b|\bproduct owner\b/i.test(text)) return "PRODUCT_MANAGER";
  if (/\bux\b|\bui\b|\buser experience\b|\bproduct designer\b/i.test(text)) {
    return "UX_DESIGN";
  }
  if (/\bqa\b|\bquality assurance\b|\btest engineer\b/i.test(text)) return "QA";
  if (
    /\bsoftware engineer\b|\bdeveloper\b|\bengineer\b|\bprogrammer\b|\bcoding\b/i.test(
      text,
    )
  ) {
    return "SOFTWARE_ENGINEER";
  }
  return null;
}

/** Rules-only title (+ optional description snippet) → taxonomy. */
export function classifyJobTitle(
  title: string,
  description?: string | null,
): ClassifiedJobTaxonomy {
  const snippet = description?.slice(0, 200) ?? "";
  const haystack = `${title} ${snippet}`.trim();
  const roleFamily = matchRoleFamily(haystack) ?? "UNKNOWN";
  return {
    roleFamily,
    jobCategory: jobCategoryFromRoleFamily(roleFamily, title),
  };
}
