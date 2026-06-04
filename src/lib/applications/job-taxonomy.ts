import type { EmploymentType, JobCategory } from "@/generated/prisma";

import type { JobListingSnapshot } from "./snapshots";

export const JOB_CATEGORY_VALUES = [
  "ENGINEERING",
  "PRODUCT",
  "DESIGN",
  "DATA",
  "OTHER",
  "UNKNOWN",
] as const satisfies readonly JobCategory[];

export const EMPLOYMENT_TYPE_VALUES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
  "UNKNOWN",
] as const satisfies readonly EmploymentType[];

const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  ENGINEERING: "Engineering",
  PRODUCT: "Product",
  DESIGN: "Design",
  DATA: "Data",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
  UNKNOWN: "Unknown",
};

export function formatJobCategoryLabel(
  category: JobCategory,
  other?: string | null,
): string {
  if (category === "OTHER" && other?.trim()) {
    return other.trim();
  }
  return JOB_CATEGORY_LABELS[category];
}

export function formatEmploymentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPE_LABELS[type];
}

export function mapJobCategoryFromAdzuna(
  category: string | null | undefined,
): JobCategory {
  if (!category?.trim()) return "UNKNOWN";
  const normalized = category.toLowerCase();
  if (/\b(engineer|developer|software|devops|it jobs|tech)\b/.test(normalized)) {
    return "ENGINEERING";
  }
  if (/\b(product|product manager)\b/.test(normalized)) return "PRODUCT";
  if (/\b(design|ux|ui)\b/.test(normalized)) return "DESIGN";
  if (/\b(data|analyst|science|machine learning|ml)\b/.test(normalized)) {
    return "DATA";
  }
  return "OTHER";
}

export function mapEmploymentTypeFromAdzuna(
  contractType: string | null | undefined,
): EmploymentType {
  if (!contractType?.trim()) return "UNKNOWN";
  const normalized = contractType.toLowerCase();
  if (/\bfull[\s-]?time|permanent\b/.test(normalized)) return "FULL_TIME";
  if (/\bpart[\s-]?time\b/.test(normalized)) return "PART_TIME";
  if (/\bcontract|temporary|temp\b/.test(normalized)) return "CONTRACT";
  if (/\bintern/.test(normalized)) return "INTERNSHIP";
  if (/\bfreelance|self[\s-]?employ/.test(normalized)) return "FREELANCE";
  return "UNKNOWN";
}

export type ListingTaxonomy = {
  jobCategory: JobCategory;
  employmentType: EmploymentType;
  jobCategoryOther: string | null;
};

export function mapTaxonomyFromListing(
  category: string | null | undefined,
  contractType: string | null | undefined,
): ListingTaxonomy {
  const jobCategory = mapJobCategoryFromAdzuna(category);
  return {
    jobCategory,
    employmentType: mapEmploymentTypeFromAdzuna(contractType),
    jobCategoryOther: jobCategory === "OTHER" ? category?.trim() || null : null,
  };
}

export function inferJobCategoryFromListing(snapshot: JobListingSnapshot): JobCategory {
  return mapJobCategoryFromAdzuna(snapshot.category);
}

export function inferEmploymentTypeFromListing(
  snapshot: JobListingSnapshot,
): EmploymentType {
  return mapEmploymentTypeFromAdzuna(snapshot.contractType);
}
