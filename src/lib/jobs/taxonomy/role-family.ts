import type { JobCategory, RoleFamily } from "@/generated/prisma";

/** Map fine-grained role family → coarse job category for indexed pre-filter. */
export function jobCategoryFromRoleFamily(
  family: RoleFamily,
  title = "",
): JobCategory {
  const hay = title.toLowerCase();
  if (family === "OTHER") {
    if (
      /\b(solutions engineer|sales engineer|pre-?sales|customer success|csm|account executive|bdr|sdr)\b/i.test(
        hay,
      )
    ) {
      return "SALES";
    }
    if (/\b(technical account manager|\btam\b|business development)\b/i.test(hay)) {
      return "BUSINESS_DEVELOPMENT";
    }
    return "OTHER";
  }

  switch (family) {
    case "FULLSTACK":
    case "FRONTEND":
    case "BACKEND":
    case "SOFTWARE_ENGINEER":
    case "MOBILE":
    case "DEVOPS":
    case "QA":
      return "ENGINEERING";
    case "DATA_SCIENCE":
    case "DATA_ANALYTICS":
    case "ML_AI":
      return "DATA_SCIENCE";
    case "PRODUCT_MANAGER":
      return "PRODUCT";
    case "UX_DESIGN":
      return "DESIGN";
    default:
      return "UNKNOWN";
  }
}
