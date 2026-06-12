import { z } from "zod";

import { RoleFamily, JobCategory } from "@/generated/prisma";

const roleFamilySchema = z.nativeEnum(RoleFamily);
const jobCategorySchema = z.nativeEnum(JobCategory);

export const searchProfileSchema = z.object({
  primaryRoles: z.array(z.string()).default([]),
  derivedRoles: z.array(z.string()).default([]),
  bridgeRoles: z.array(z.string()).default([]),
  backgroundDomains: z.array(z.string()).default([]),
  targetRoleFamilies: z.array(roleFamilySchema).default([]),
  targetCategories: z.array(jobCategorySchema).default([]),
  isCareerChange: z.boolean().default(false),
  source: z.enum(["import", "rules", "manual"]).optional(),
});

export type SearchProfile = z.infer<typeof searchProfileSchema>;
